'use client';

import { useState, useEffect } from 'react';

interface IPData {
    ip: string;
    location: string;
}

// 将 WebRTC 相关函数移到组件外部
const getLocalIP = () => {
  return new Promise<string>((resolve, reject) => {
    // 确保在客户端环境中执行
    if (typeof window === 'undefined') {
      reject(new Error('服务端环境不支持WebRTC'));
      return;
    }
    
    const PeerConnection = window.RTCPeerConnection || 
      (window as unknown as { webkitRTCPeerConnection: typeof window.RTCPeerConnection }).webkitRTCPeerConnection || 
      (window as unknown as { mozRTCPeerConnection: typeof window.RTCPeerConnection }).mozRTCPeerConnection;

    if (!PeerConnection) {
      reject(new Error('WebRTC not supported'));
      return;
    }

    const pc = new PeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.nextcloud.com:443' },
        { urls: 'stun:stun.sipgate.net:3478' }
      ]
    });

    pc.createDataChannel('');
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(err => {
        pc.close();
        reject(err);
      });

    let foundIP = false;
    let fallbackIP: string | null = null;
    
    pc.onicecandidate = (ice) => {
      if (!ice || !ice.candidate || !ice.candidate.candidate) {
        return;
      }

      const candidate = ice.candidate.candidate;
      const match = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
      if (match) {
        const ip = match[1];
        const ipParts = ip.split('.');
        const isValidIP = ipParts.length === 4 && 
          ipParts.every(part => {
            const num = parseInt(part);
            return num >= 0 && num <= 255;
          });

        if (isValidIP) {
          // 优先使用公网IP（本机真实IP，不受VPN影响）
          if (!ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.')) {
            foundIP = true;
            pc.onicecandidate = null;
            pc.close();
            resolve(ip);
          } else if (!fallbackIP) {
            // 保存内网IP作为备选
            fallbackIP = ip;
          }
        }
      }
    };

    setTimeout(() => {
      if (!foundIP) {
        pc.onicecandidate = null;
        pc.close();
        if (fallbackIP) {
          // 如果没有找到公网IP，使用内网IP
          resolve(fallbackIP);
        } else {
          reject(new Error('获取本地IP超时'));
        }
      }
    }, 8000); // 增加超时时间到8秒
  });
};

export default function IPInfo() {
  const [hasMounted, setHasMounted] = useState(false);
  const [currentIP, setCurrentIP] = useState<IPData>({ ip: '获取中...', location: '获取中...' });
  const [proxyIP, setProxyIP] = useState<IPData>({ ip: '获取中...', location: '获取中...' });
  const [currentIPError, setCurrentIPError] = useState<string | null>(null);
  const [proxyIPError, setProxyIPError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIPInfo = async () => {
    // 确保在客户端环境中执行
    if (typeof window === 'undefined') return;
    
    setLoading(true);
    setCurrentIPError(null);
    setProxyIPError(null);

    // 获取当前IP
    const fetchCurrentIP = async () => {
      try {
        const localIP = await getLocalIP();
        
        // 获取本地IP的位置信息
        const currentLocationResponse = await fetch(`https://ipapi.co/${localIP}/json/`, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (!currentLocationResponse.ok) {
          throw new Error('获取位置信息失败');
        }
        
        const currentLocationData = await currentLocationResponse.json();

        setCurrentIP({
          ip: localIP,
          location: currentLocationData.country_name && currentLocationData.city 
            ? `${currentLocationData.city}, ${currentLocationData.country_name}`
            : '未知位置'
        });
      } catch (error) {
        console.error('Failed to fetch current IP:', error);
        setCurrentIPError(error instanceof Error ? error.message : '获取当前IP失败');
        setCurrentIP({ ip: '未获取到', location: '未获取到' });
      }
    };

    // 获取代理IP
    const fetchProxyIP = async () => {
      try {
        const proxyResponse = await fetch('https://api.ipify.org?format=json', {
          headers: { 'Accept': 'application/json' }
        });
        
        if (!proxyResponse.ok) {
          throw new Error('获取代理IP失败');
        }
        
        const proxyData = await proxyResponse.json();
        
        if (!proxyData.ip) {
          throw new Error('无法获取代理IP');
        }

        // 获取代理IP的位置信息
        const proxyLocationResponse = await fetch(`https://ipapi.co/${proxyData.ip}/json/`, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (!proxyLocationResponse.ok) {
          throw new Error('获取代理位置信息失败');
        }
        
        const proxyLocationData = await proxyLocationResponse.json();

        setProxyIP({
          ip: proxyData.ip,
          location: proxyLocationData.country_name && proxyLocationData.city 
            ? `${proxyLocationData.city}, ${proxyLocationData.country_name}`
            : '未知位置'
        });
      } catch (error) {
        console.error('Failed to fetch proxy IP:', error);
        setProxyIPError(error instanceof Error ? error.message : '获取代理IP失败');
        setProxyIP({ ip: '未获取到', location: '未获取到' });
      }
    };

    // 并行获取两个IP信息
    await Promise.all([fetchCurrentIP(), fetchProxyIP()]);
    
    setLoading(false);
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    
    fetchIPInfo();
  }, [hasMounted]);

  const handleRetry = () => {
    if (!hasMounted || typeof window === 'undefined') return;
    
    setLoading(true);
    setCurrentIPError(null);
    setProxyIPError(null);
    setCurrentIP({ ip: '获取中...', location: '获取中...' });
    setProxyIP({ ip: '获取中...', location: '获取中...' });
    
    // 重新触发数据获取
    fetchIPInfo();
  };

  // 服务端渲染时显示加载状态
  if (!hasMounted) {
    return (
      <div className="widget-card ip-info-widget p-4 bg-card/80 backdrop-blur-sm text-card-foreground w-[220px] h-[150px] flex flex-col justify-between relative overflow-hidden group animate-fade-in">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none transition-opacity group-hover:opacity-20"></div>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm">获取IP信息...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-card ip-info-widget p-4 bg-card/80 backdrop-blur-sm text-card-foreground w-[220px] h-[150px] flex flex-col justify-between relative overflow-hidden group animate-fade-in">
      <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none transition-opacity group-hover:opacity-20"></div>
      
      {loading ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm">获取IP信息...</p>
        </div>
      ) : (currentIPError && proxyIPError) ? (
        <>
          <div className="flex justify-between items-start relative z-10">
            <div>
          <h3 className="text-xl font-medium text-destructive">获取失败</h3>
        </div>
            <div className="flex items-center space-x-1">
              <div className="weather-icon">
                <span className="text-2xl text-destructive">⚠️</span>
              </div>
            </div>
          </div>
          
        <div className="mt-2 relative z-10">
          <p className="text-sm text-muted-foreground break-words overflow-hidden line-clamp-3">获取IP信息失败，请稍后重试</p>
          <button 
              onClick={handleRetry}
            className="mt-2 text-xs text-primary hover:underline focus:outline-none"
          >
            点击重试
          </button>
        </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center space-x-1">
              <div className="weather-icon text-primary">
                <i className="qi-location text-2xl"></i>
            </div>
            </div>
          </div>
          
          <div className="relative z-10">
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">当前IP</p>
                {currentIPError ? (
                  <p className="text-sm text-destructive">未查询到当前IP信息</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">{currentIP.ip}</p>
                    <p className="text-xs text-muted-foreground">{currentIP.location}</p>
                  </>
                )}
        </div>
        <div>
                <p className="text-xs text-muted-foreground">代理IP</p>
                {proxyIPError ? (
                  <p className="text-sm text-destructive">未查询到代理IP信息</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">{proxyIP.ip}</p>
                    <p className="text-xs text-muted-foreground">{proxyIP.location}</p>
                  </>
                )}
            </div>
            </div>
          </div>
        </>
      )}
      </div>
  );
}