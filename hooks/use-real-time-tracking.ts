'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface TrackingEvent {
  type: 'connected' | 'tracking_update' | 'status_change' | 'heartbeat' | 'error' | 'order_update';
  data?: any;
  message?: string;
  timestamp: string;
}

interface RealTimeTrackingData {
  orderId: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string;
  carrier?: string;
  liveTracking?: {
    status: string;
    currentLocation?: string;
    estimatedDelivery?: string;
    trackingHistory?: Array<{
      status: string;
      location: string;
      timestamp: string;
      remarks?: string;
    }>;
  };
  lastUpdated: string;
  hasNewUpdate: boolean;
}

interface UseRealTimeTrackingOptions {
  enableNotifications?: boolean;
  enableToasts?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  onStatusChange?: (data: any) => void;
  onTrackingUpdate?: (data: RealTimeTrackingData) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useRealTimeTracking(
  orderId?: string,
  trackingNumber?: string,
  options: UseRealTimeTrackingOptions = {}
) {
  const {
    enableNotifications = true,
    enableToasts = true,
    autoReconnect = true,
    reconnectInterval = 5000,
    onStatusChange,
    onTrackingUpdate,
    onConnectionChange
  } = options;

  const [trackingData, setTrackingData] = useState<RealTimeTrackingData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && enableNotifications) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted' && enableToasts) {
          toast.success('Notifications enabled for order updates');
        }
      }
    }
  }, [enableNotifications, enableToasts]);

  // Show notification
  const showNotification = useCallback((title: string, body: string, data?: any) => {
    if (!enableNotifications) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icons/package.png',
        tag: `order-${orderId || trackingNumber}`,
        data
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    } else if (enableToasts) {
      toast.success(`${title}: ${body}`);
    }
  }, [enableNotifications, enableToasts, orderId, trackingNumber]);

  // Connect to SSE
  const connect = useCallback(() => {
    if (!orderId && !trackingNumber) {
      setError('Order ID or tracking number is required');
      return;
    }

    const params = new URLSearchParams();
    if (orderId) params.append('orderId', orderId);
    if (trackingNumber) params.append('trackingNumber', trackingNumber);

    const eventSource = new EventSource(`/api/tracking/live?${params}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('Real-time tracking connected');
      setIsConnected(true);
      setError(null);
      reconnectAttempts.current = 0;
      onConnectionChange?.(true);
      
      if (enableToasts) {
        toast.success('Live tracking connected');
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const trackingEvent: TrackingEvent = JSON.parse(event.data);
        
        switch (trackingEvent.type) {
          case 'connected':
            console.log('SSE Connected:', trackingEvent.message);
            break;

          case 'tracking_update':
            const updateData = trackingEvent.data as RealTimeTrackingData;
            setTrackingData(updateData);
            setLastUpdate(new Date());
            onTrackingUpdate?.(updateData);

            if (updateData.hasNewUpdate && enableToasts) {
              toast.info(`Tracking updated for order ${updateData.orderNumber}`);
            }
            break;

          case 'status_change':
            console.log('Status changed:', trackingEvent.data);
            onStatusChange?.(trackingEvent.data);
            
            showNotification(
              'Order Status Updated',
              trackingEvent.data.message,
              trackingEvent.data
            );
            break;

          case 'heartbeat':
            // Keep connection alive
            console.log('SSE Heartbeat received');
            break;

          case 'error':
            console.error('SSE Error:', trackingEvent.message);
            setError(trackingEvent.message || 'Unknown error');
            if (enableToasts) {
              toast.error(trackingEvent.message || 'Tracking error occurred');
            }
            break;

          case 'order_update':
            console.log('Order update:', trackingEvent.data);
            // Handle general order updates
            break;

          default:
            console.log('Unknown event type:', trackingEvent.type);
        }
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      setIsConnected(false);
      setError('Connection error');
      onConnectionChange?.(false);

      // Attempt reconnection
      if (autoReconnect && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        
        if (enableToasts) {
          toast.error(`Connection lost. Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Reconnecting to tracking... (attempt ${reconnectAttempts.current})`);
          disconnect();
          connect();
        }, reconnectInterval * reconnectAttempts.current); // Exponential backoff
      } else if (enableToasts) {
        toast.error('Failed to connect to live tracking after multiple attempts');
      }
    };
  }, [
    orderId,
    trackingNumber,
    autoReconnect,
    reconnectInterval,
    enableToasts,
    showNotification,
    onStatusChange,
    onTrackingUpdate,
    onConnectionChange
  ]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  // Initialize connection
  useEffect(() => {
    if (orderId || trackingNumber) {
      requestNotificationPermission();
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [orderId, trackingNumber, connect, disconnect, requestNotificationPermission]);

  // Reconnect when the browser tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && (orderId || trackingNumber)) {
        console.log('Tab became visible, reconnecting tracking...');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected, orderId, trackingNumber, connect]);

  return {
    trackingData,
    isConnected,
    error,
    lastUpdate,
    connect,
    disconnect,
    reconnect: () => {
      disconnect();
      setTimeout(connect, 1000);
    }
  };
}

// Hook for managing multiple order tracking without violating Rules of Hooks
export function useMultipleOrderTracking(orderIds: string[], options: UseRealTimeTrackingOptions = {}) {
  const [trackingData, setTrackingData] = useState<Record<string, RealTimeTrackingData>>({});
  const [connections, setConnections] = useState<Record<string, boolean>>({});
  const sourcesRef = useRef<Record<string, EventSource>>({});

  const connectOne = useCallback((orderId: string) => {
    // Avoid duplicate connections
    if (sourcesRef.current[orderId]) return;

    const params = new URLSearchParams();
    params.append('orderId', orderId);
    const es = new EventSource(`/api/tracking/live?${params.toString()}`);
    sourcesRef.current[orderId] = es;

    es.onopen = () => {
      setConnections(prev => ({ ...prev, [orderId]: true }));
      options.onConnectionChange?.(true);
      if (options.enableToasts) toast.success(`Live tracking connected (${orderId})`);
    };

    es.onmessage = (event) => {
      try {
        const trackingEvent: TrackingEvent = JSON.parse(event.data);
        switch (trackingEvent.type) {
          case 'tracking_update': {
            const data = trackingEvent.data as RealTimeTrackingData;
            setTrackingData(prev => ({ ...prev, [orderId]: data }));
            options.onTrackingUpdate?.(data);
            if (data.hasNewUpdate && options.enableToasts) {
              toast.info(`Tracking updated for order ${data.orderNumber}`);
            }
            break;
          }
          case 'status_change': {
            options.onStatusChange?.(trackingEvent.data);
            if (options.enableNotifications) {
              // Best effort toast as notification fallback here
              if (options.enableToasts) toast.success(`Order status updated (${orderId})`);
            }
            break;
          }
          case 'heartbeat':
            // no-op
            break;
          case 'error': {
            setConnections(prev => ({ ...prev, [orderId]: false }));
            if (options.enableToasts) toast.error(trackingEvent.message || `Tracking error (${orderId})`);
            break;
          }
          default:
            break;
        }
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    };

    es.onerror = (err) => {
      console.error('SSE Error:', err);
      setConnections(prev => ({ ...prev, [orderId]: false }));
      options.onConnectionChange?.(false);
    };
  }, [options]);

  const disconnectOne = useCallback((orderId: string) => {
    const es = sourcesRef.current[orderId];
    if (es) {
      es.close();
      delete sourcesRef.current[orderId];
    }
    setConnections(prev => ({ ...prev, [orderId]: false }));
  }, []);

  // Manage connections according to orderIds
  useEffect(() => {
    // Only proceed if orderIds has actual changes
    if (!orderIds || orderIds.length === 0) {
      // Disconnect all if no order IDs
      Object.keys(sourcesRef.current).forEach(disconnectOne);
      return;
    }

    const currentIds = new Set(Object.keys(sourcesRef.current));
    const nextIds = new Set(orderIds);

    // Only make changes if there are actual differences
    const hasChanges = currentIds.size !== nextIds.size || 
                      Array.from(currentIds).some(id => !nextIds.has(id)) ||
                      Array.from(nextIds).some(id => !currentIds.has(id));

    if (!hasChanges) return;

    console.log('Updating tracking connections:', { 
      current: Array.from(currentIds), 
      next: Array.from(nextIds) 
    });

    // Connect new ids
    orderIds.forEach(id => {
      if (!currentIds.has(id)) {
        console.log('Connecting tracking for order:', id);
        connectOne(id);
      }
    });

    // Disconnect removed ids
    currentIds.forEach(id => {
      if (!nextIds.has(id)) {
        console.log('Disconnecting tracking for order:', id);
        disconnectOne(id);
      }
    });

    return () => {
      // Cleanup on unmount
      Object.keys(sourcesRef.current).forEach(id => {
        console.log('Cleanup: disconnecting tracking for order:', id);
        disconnectOne(id);
      });
    };
  }, [orderIds.join(','), connectOne, disconnectOne]); // Use join to prevent array reference changes

  const reconnectAll = useCallback(() => {
    const ids = Object.keys(sourcesRef.current);
    ids.forEach(id => {
      disconnectOne(id);
      connectOne(id);
    });
  }, [connectOne, disconnectOne]);

  return {
    trackingData,
    connections,
    isAnyConnected: Object.values(connections).some(Boolean),
    allConnected: Object.values(connections).every(Boolean),
    reconnectAll,
  };
}
