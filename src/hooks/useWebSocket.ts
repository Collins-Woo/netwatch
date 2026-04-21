/**
 * WebSocket Hook - 前端实时通信
 * 用于连接后端WebSocket服务，接收实时更新
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Task, Agent, Alert } from '../types';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  tasks: Task[];
  nodes: Agent[];
  alerts: Alert[];
  triggerTask: (taskId: string) => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    onMessage,
    onConnect,
    onDisconnect,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const [isConnected, setIsConnected] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [nodes, setNodes] = useState<Agent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // 初始化WebSocket连接
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectCountRef.current = 0;

        // 注册为Admin客户端
        sendMessage({ type: 'admin_register' });

        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        onDisconnect?.();

        // 尝试重连
        if (reconnectCountRef.current < maxReconnectAttempts) {
          reconnectCountRef.current++;
          console.log(`Reconnecting... (${reconnectCountRef.current}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [url, onMessage, onConnect, onDisconnect, reconnectInterval, maxReconnectAttempts]);

  // 处理接收到的消息
  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      // 初始状态
      case 'initial_state':
        if (message.tasks) {
          setTasks(message.tasks.map(mapTaskFromServer));
        }
        if (message.nodes) {
          setNodes(message.nodes.map(mapNodeFromServer));
        }
        if (message.recentAlerts) {
          setAlerts(message.recentAlerts.map(mapAlertFromServer));
        }
        break;

      // 节点上线
      case 'node_online':
        setNodes(prev => prev.map(node =>
          node.id === message.node.id
            ? { ...node, status: 'online' as const }
            : node
        ));
        break;

      // 节点离线
      case 'node_offline':
        setNodes(prev => prev.map(node =>
          node.id === message.nodeId
            ? { ...node, status: 'offline' as const }
            : node
        ));
        break;

      // 任务状态更新
      case 'task_status_update':
        setTasks(prev => prev.map(task =>
          task.id === message.task.id
            ? {
                ...task,
                status: message.task.status,
                lastResponseTime: message.task.lastResponseTime,
                lastCheckTime: message.task.lastCheckTime
              }
            : task
        ));
        break;

      // 新告警
      case 'new_alert':
        setAlerts(prev => [mapAlertFromServer(message.alert), ...prev].slice(0, 100));
        break;

      // 心跳响应
      case 'heartbeat_ack':
        // 心跳正常
        break;

      // 错误
      case 'error':
        console.error('Server error:', message.message);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  // 发送消息
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  // 触发任务
  const triggerTask = useCallback((taskId: string) => {
    sendMessage({ type: 'trigger_task', taskId });
  }, [sendMessage]);

  // 生命周期管理
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    sendMessage,
    tasks,
    nodes,
    alerts,
    triggerTask
  };
}

// 数据映射函数
function mapTaskFromServer(task: any): Task {
  return {
    id: task.id,
    name: task.name,
    type: task.type,
    target: task.target,
    interval: task.interval || 5,
    timeout: task.timeout || 10,
    statusCode: task.status_code,
    alertThreshold: task.alert_threshold || 3,
    nodeId: task.node_id,
    enabled: task.enabled ?? true,
    status: task.status || 'normal',
    lastResponseTime: task.last_response_time,
    lastCheckTime: task.last_check_time,
    availability: task.availability,
    config: task.config || {},
    createdAt: task.created_at || new Date().toISOString(),
    updatedAt: task.updated_at || new Date().toISOString()
  };
}

function mapNodeFromServer(node: any): Agent {
  return {
    id: node.id,
    name: node.name,
    ip: node.ip || '',
    region: node.region || 'east',
    description: node.description || '',
    registerKey: node.register_key,
    enabled: node.enabled ?? true,
    status: node.status || 'offline',
    lastHeartbeat: node.last_heartbeat,
    cpuUsage: node.cpu_usage,
    memoryUsage: node.memory_usage,
    taskCount: node.task_count || 0,
    createdAt: node.created_at || new Date().toISOString()
  };
}

function mapAlertFromServer(alert: any): Alert {
  return {
    id: alert.id,
    taskId: alert.task_id,
    taskName: alert.task_name,
    level: alert.level || 'warning',
    message: alert.message || '',
    responseTime: alert.response_time,
    statusCode: alert.status_code,
    createdAt: alert.created_at || new Date().toISOString(),
    acknowledged: alert.acknowledged ?? false
  };
}

// ============ WebSocket Provider ============

import React, { createContext, useContext, ReactNode } from 'react';

interface WebSocketContextType extends UseWebSocketReturn {
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  sendMessage: () => {},
  tasks: [],
  nodes: [],
  alerts: [],
  triggerTask: () => {}
});

export function WebSocketProvider({
  children,
  wsUrl
}: {
  children: ReactNode;
  wsUrl?: string;
}) {
  // 默认连接到当前域名的WebSocket服务
  const defaultUrl = wsUrl || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

  const ws = useWebSocket({
    url: defaultUrl,
    reconnectInterval: 5000,
    maxReconnectAttempts: 20
  });

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  return useContext(WebSocketContext);
}

// ============ 连接状态指示器 ============

export function WebSocketStatus() {
  const { isConnected } = useWebSocketContext();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className="text-xs text-gray-500">
        {isConnected ? '实时连接' : '离线'}
      </span>
    </div>
  );
}

export default useWebSocket;
