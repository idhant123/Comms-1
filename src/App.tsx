/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  DisconnectButton,
  useMediaDeviceSelect,
  useConnectionQualityIndicator
} from '@livekit/components-react';
import '@livekit/components-styles';
import { ConnectionQuality, Track, LocalAudioTrack } from 'livekit-client';
import { KrispNoiseFilter, isKrispNoiseFilterSupported } from '@livekit/krisp-noise-filter';
import { SignJWT } from 'jose';

declare global {
  interface Window {
    cordova?: any;
  }
}

function BandwidthIndicator({ participant, type = 'tx' }: { participant: any, type?: 'tx' | 'rx' }) {
  const [bitrate, setBitrate] = useState(0);

  useEffect(() => {
    if (!participant) return;
    
    // Poll the tracks for current bitrate
    const interval = setInterval(() => {
      let total = 0;
      participant.getTrackPublications().forEach((pub: any) => {
        if (pub.track && pub.track.currentBitrate) {
          total += pub.track.currentBitrate;
        }
      });
      setBitrate(total);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [participant]);
  
  if (bitrate === 0) return <div className="text-[9px] tracking-widest mt-1 text-zinc-500">BW: IDLE</div>;
  
  const kbps = (bitrate / 1000).toFixed(1);
  return <div className="text-[9px] tracking-widest mt-1 text-cyan-500">BW({type.toUpperCase()}): {kbps} kbps</div>;
}

function QualityIndicator({ participant }: { participant: any }) {
  const { quality } = useConnectionQualityIndicator({ participant });
  
  let color = 'text-zinc-500';
  let label = 'UNKNOWN';
  
  switch(quality) {
    case ConnectionQuality.Excellent:
      color = 'text-emerald-400';
      label = 'EXCELLENT';
      break;
    case ConnectionQuality.Good:
      color = 'text-emerald-500 opacity-80';
      label = 'GOOD';
      break;
    case ConnectionQuality.Poor:
      color = 'text-amber-500';
      label = 'POOR';
      break;
    case ConnectionQuality.Lost:
      color = 'text-red-500';
      label = 'LOST';
      break;
  }
  
  return <div className={`text-[9px] tracking-widest mt-1 ${color}`}>QOS: {label}</div>;
}

export default function App() {
  const [roomId, setRoomId] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [liveKitUrl, setLiveKitUrl] = useState<string>('');

  const generateRoomId = () => {
    const newId = Math.random().toString(36).substring(2, 10).toUpperCase();
    setRoomId(newId);
  };

  const connectToLiveKit = async () => {
    setError(null);
    if (!roomId) { 
      setError('ENTER_CHANNEL_ID'); 
      return; 
    }
    
    setIsConnecting(true);
    try {
      // Create a random participant name for this user
      const participantName = 'operator_' + Math.floor(Math.random() * 10000);
      
      const livekitApiKey = "APIAXaDJQSoYWU6";
      const livekitApiSecret = "xgNGMB07bclnTeuXekMWLjIrLMmuQyLpMNeoycG8Q18A";
      const url = "wss://resilientcomm-2ilgjgbh.livekit.cloud";

      const secret = new TextEncoder().encode(livekitApiSecret);
      const generatedToken = await new SignJWT({
        name: participantName,
        video: {
          room: roomId,
          roomJoin: true
        }
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(livekitApiKey)
        .setSubject(participantName)
        .setIssuedAt()
        .setNotBefore(Math.floor(Date.now() / 1000) - 60)
        .setExpirationTime('2h')
        .sign(secret);

      setLiveKitUrl(url);
      setToken(generatedToken);
    } catch (err: any) {
      console.error(err);
      setError('CONNECTION_ERROR: ' + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const leaveRoom = () => {
    setToken(null);
  };

  return (
    <div className="flex flex-col w-full h-full bg-black text-emerald-500 font-mono overflow-hidden relative">
      <div className="scanlines"></div>
      
      <header className="p-3 sm:p-4 border-b-2 border-emerald-500/30 flex flex-col md:flex-row justify-between items-start md:items-center z-10 relative gap-3 sm:gap-4 select-none">
        <div className="flex flex-row items-center justify-between w-full md:w-auto gap-2">
          <div className="flex flex-row items-center gap-3">
            <div className="w-3 h-3 bg-emerald-500 animate-[pulse_2s_infinite] bracket-corners"></div>
            <h1 className="text-sm sm:text-xl font-bold tracking-[0.2em] uppercase">Encrypted Coms</h1>
          </div>
          <div className="md:hidden text-[9px] px-2 py-1 border-l-2 uppercase tracking-widest bg-black whitespace-nowrap overflow-hidden text-ellipsis border-zinc-600 text-zinc-500">
             {token ? 'SECURE' : 'AWAITING'}
          </div>
        </div>
        
        {!token && (
          <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-2">
            <form className="flex flex-col lg:flex-row w-full gap-2" onSubmit={(e) => { e.preventDefault(); connectToLiveKit(); }}>
              <div className="flex w-full lg:w-auto">
                  <input 
                      type="text" 
                      value={roomId} 
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      placeholder="ENTER_CHANNEL_ID"
                      className="flex-1 bg-black border border-emerald-500/50 text-emerald-500 p-2 text-xs outline-none min-w-0 uppercase tracking-widest placeholder-emerald-900 focus:border-emerald-500 transition-colors"
                  />
                  <button type="button" onClick={generateRoomId} className="border border-l-0 border-emerald-500/50 p-2 text-[10px] sm:text-xs px-2 sm:px-3 hover:bg-emerald-500/20 hover:border-emerald-500 transition-colors uppercase tracking-widest bg-black font-bold">GEN</button>
              </div>
              <button 
                type="submit"
                disabled={isConnecting}
                className="w-full lg:w-auto min-h-[44px] border border-emerald-500/50 p-2 text-xs px-4 hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-50 whitespace-nowrap uppercase tracking-widest font-bold bg-black"
              >
                {isConnecting ? 'CONNECTING...' : 'INITIATE_LINK'}
              </button>
            </form>
            {error && <div className="text-[10px] text-red-500 w-full text-center md:text-right uppercase tracking-widest">[{error}]</div>}
          </div>
        )}
        
        {token && (
          <div className={`hidden md:block text-xs px-3 py-1 border-l-2 uppercase tracking-widest ${error ? 'border-red-500 text-red-500' : 'border-emerald-500 text-emerald-500'} bg-black`}>
            [{error ? error : 'SYS_STATUS: SECURE_LINK_ACTIVATED'}]
          </div>
        )}
      </header>
      
      {(token && liveKitUrl) ? (
        <LiveKitRoom
          video={false}
          audio={{ echoCancellation: true, noiseSuppression: true, autoGainControl: true }}
          token={token}
          serverUrl={liveKitUrl}
          connect={true}
          data-lk-theme="default"
          onDisconnected={leaveRoom}
          onError={(err) => {
            console.error('LiveKitRoom error:', err);
            if (err.message !== 'Client initiated disconnect') {
              setError('LIVEKIT_ERROR: ' + err.message);
            }
          }}
          onConnected={() => console.log('LiveKit connection established.')}
          className="flex-1 flex w-full relative z-10 min-h-0"
        >
          <ActiveCallInterface roomName={roomId} leaveRoom={leaveRoom} />
          <RoomAudioRenderer />
        </LiveKitRoom>
      ) : (
        <div className="flex-1 flex items-center justify-center relative z-10 hash-pattern p-4">
          <div className="text-emerald-700 text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.5em] animate-pulse uppercase bracket-corners p-4 sm:p-6 bg-black border border-emerald-900/50 text-center break-all max-w-md w-full">AWAITING_CONNECTION_PARAMETERS...</div>
        </div>
      )}
    </div>
  );
}

// Sub-component that actually uses the LiveKit hooks
function ActiveCallInterface({ roomName, leaveRoom }: { roomName: string, leaveRoom: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const hasRemote = remoteParticipants.length > 0;
  
  const [ancEnabled, setAncEnabled] = useState(false);
  const [ancSupported, setAncSupported] = useState(false);

  useEffect(() => {
    setAncSupported(isKrispNoiseFilterSupported());
  }, []);

  // Checking if local microphone is sending data
  const isMicOn = localParticipant?.isMicrophoneEnabled;
  
  useEffect(() => {
    if (!localParticipant || !ancSupported) return;
    
    // Find microphone track
    const pub = localParticipant.getTrackPublication(Track.Source.Microphone);
    if (!pub || !pub.audioTrack) return;
    
    const audioTrack = pub.audioTrack as LocalAudioTrack;
    
    // Setup and enable/disable ANC
    if (ancEnabled) {
      if (!audioTrack.getProcessor()) {
         try {
           audioTrack.setProcessor(KrispNoiseFilter()).catch((e: any) => console.error(e));
         } catch(e) {
             console.error("error setting krisp noise filter", e)
         }
      }
    } else {
      if (audioTrack.getProcessor()) {
        audioTrack.stopProcessor().catch((e: any) => console.error(e));
      }
    }
  }, [localParticipant, ancEnabled, ancSupported, isMicOn]);

  // Enable background execution during active calls
  useEffect(() => {
    try {
      if (window.cordova?.plugins?.backgroundMode) {
        window.cordova.plugins.backgroundMode.enable();
        // Android foreground notification customization
        window.cordova.plugins.backgroundMode.setDefaults({
            title: 'ResilientComm Active',
            text: 'Running in background to maintain connection',
            icon: 'icon',
            color: 'F14F4D', 
            resume: true,
            hidden: false
        });
      }
    } catch (e) {
      console.warn("Background mode plugin not available");
    }

    return () => {
      try {
        if (window.cordova?.plugins?.backgroundMode) {
          window.cordova.plugins.backgroundMode.disable();
        }
      } catch (e) {
        console.warn("Background mode plugin not available");
      }
    };
  }, []);
  
  // Microphone device selection
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind: 'audioinput' });

  return (
    <div className="w-full flex flex-col h-full bg-black">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-[2px] bg-emerald-500/20 p-2 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
        
        <div className="bg-black p-4 md:p-6 relative flex flex-col items-center justify-center min-h-[250px] min-w-0 bracket-corners hash-pattern overflow-y-auto">
          <div className="absolute top-0 right-0 border-b border-l border-emerald-500/30 p-1 px-2 text-[9px] text-emerald-700 bg-black z-20 font-bold">TX_NODE</div>
          <span className="absolute top-2 left-2 text-[10px] bg-emerald-950/50 border border-emerald-500/30 px-2 py-1 tracking-widest z-20 uppercase">LOCAL_AUDIO</span>
          {isMicOn ? (
            <div className="flex flex-col items-center z-10 p-6 bg-black/60 border border-emerald-500/20 backdrop-blur-sm w-full max-w-sm">
              <div className="w-20 h-20 rounded-none border-[1px] border-emerald-500 flex items-center justify-center relative">
                 <div className="absolute inset-0 border-[1px] border-emerald-500 animate-[ping_2s_ease-out_infinite] opacity-50"></div>
                 <div className="w-10 h-10 border border-emerald-500 bg-emerald-500/20 animate-[pulse_1s_ease-in-out_infinite] rotate-45"></div>
              </div>
              <div className="mt-8 text-xs tracking-widest text-emerald-400 font-bold bg-emerald-950/30 px-3 py-1 border-l-2 border-emerald-500 uppercase">MIC_ACTIVE [{localParticipant.identity}]</div>
              {localParticipant && (
                <div className="flex flex-col gap-1 mt-4 items-center w-full bg-black border border-emerald-900/50 p-3">
                  <QualityIndicator participant={localParticipant} />
                  <BandwidthIndicator participant={localParticipant} type="tx" />
                </div>
              )}

              <div className="mt-6 flex flex-col items-center gap-2 z-30 w-full">
                <button
                  onClick={() => localParticipant?.setMicrophoneEnabled(false)}
                  className="mb-4 border border-red-500/50 min-h-[44px] p-2 text-[10px] tracking-widest flex items-center justify-center transition-all w-full font-bold text-red-500 bg-black hover:border-red-500 hover:bg-red-500/10"
                >
                  <span className="uppercase">MUTE_MIC [CUT_TX]</span>
                </button>
                <label className="text-[9px] text-emerald-600/80 tracking-widest uppercase mb-1 border-b border-emerald-900/50 w-full text-center pb-1 truncate">INPUT_HARDWARE_SELECT</label>
                <select 
                  className="bg-black border border-emerald-500/30 text-emerald-500 text-[10px] p-2 min-h-[44px] outline-none w-full max-w-full text-center cursor-pointer hover:border-emerald-500 transition-colors uppercase tracking-widest text-ellipsis"
                  value={activeDeviceId}
                  onChange={(e) => setActiveMediaDevice(e.target.value)}
                >
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId} className="bg-black text-emerald-500">
                      {device.label || `MIC_DEVICE_${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
                {ancSupported && (
                  <button 
                    onClick={() => setAncEnabled(!ancEnabled)}
                    className={`mt-2 border min-h-[44px] p-2 text-[10px] tracking-widest flex items-center justify-between transition-all w-full font-bold ${ancEnabled ? 'border-emerald-500 text-black bg-emerald-500' : 'border-emerald-500/50 text-emerald-500 bg-black hover:border-emerald-500 hover:bg-emerald-500/10'}`}
                  >
                    <span>NOISE_SUPPRESSION</span>
                    <span className="uppercase">[{ancEnabled ? 'ENGAGED' : 'STANDBY'}]</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center z-10 bg-black/80 p-8 border border-zinc-900 w-full max-w-sm">
              <div className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase mb-4 border-b border-zinc-900 pb-2 w-full text-center">MIC_HARDWARE_OFFLINE</div>
              {localParticipant && (
                <div className="flex flex-col gap-2 w-full items-center bg-black p-3 border border-zinc-900/50">
                  <QualityIndicator participant={localParticipant} />
                  <BandwidthIndicator participant={localParticipant} type="tx" />
                </div>
              )}
              
              <button
                onClick={() => localParticipant?.setMicrophoneEnabled(true)}
                className="mt-6 border border-emerald-500/50 min-h-[44px] p-2 text-[10px] tracking-widest flex items-center justify-center transition-all w-full font-bold text-emerald-500 bg-emerald-500/10 hover:border-emerald-500 hover:bg-emerald-500/30"
              >
                <span className="uppercase">UNMUTE_MIC [RESUME_TX]</span>
              </button>
            </div>
          )}
        </div>

        <div className="bg-black p-4 md:p-6 relative flex flex-col items-start justify-start min-h-[250px] overflow-y-auto bracket-corners hash-pattern min-w-0">
          <div className="absolute top-0 right-0 border-b border-l border-emerald-500/30 p-1 px-2 text-[9px] text-emerald-700 bg-black z-20 font-bold">RX_NODE</div>
          <span className="absolute top-2 left-2 text-[10px] bg-emerald-950/50 border border-emerald-500/30 px-2 py-1 tracking-widest z-20 uppercase">REMOTE_INTERCEPT</span>
          {hasRemote ? (
            <div className="flex flex-col w-full mt-10 gap-3 z-10 bg-black/60 backdrop-blur-sm p-4 border border-emerald-500/20 max-w-xl mx-auto">
              <div className="text-[10px] tracking-[0.2em] text-emerald-500 border-b border-emerald-500/30 pb-2 mb-2 flex justify-between uppercase font-bold">
                <span>ACTIVE_OPERATORS</span>
                <span className="bg-emerald-500 text-black px-2">{remoteParticipants.length}</span>
              </div>
              {remoteParticipants.map((p) => (
                <div key={p.identity} className="flex flex-col border-l-2 border-emerald-500 bg-emerald-950/10 p-3 hover:bg-emerald-900/20 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-none bg-emerald-500 animate-pulse"></div>
                      <span className="text-[11px] text-emerald-200 tracking-widest uppercase">{p.identity}</span>
                    </div>
                    <span className={`text-[9px] tracking-widest px-1 border uppercase ${p.isMicrophoneEnabled ? 'border-emerald-500 text-emerald-400 bg-emerald-900/30' : 'border-zinc-600 text-zinc-500 bg-black'}`}>
                      MIC:{p.isMicrophoneEnabled ? 'ON' : 'MUTE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-emerald-900/30 pt-2 mt-1">
                    <BandwidthIndicator participant={p} type="rx" />
                    <QualityIndicator participant={p} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center w-full z-10">
              <div className="text-emerald-700 text-[10px] tracking-[0.3em] uppercase bg-black border border-emerald-900/50 p-4">WAITING_FOR_REMOTE_OPERATOR...</div>
            </div>
          )}
        </div>

      </div>

      <footer className="p-3 border-t-2 border-emerald-500/30 bg-black flex flex-col sm:flex-row justify-between items-center text-[9px] tracking-widest uppercase text-emerald-600 gap-3">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 items-center max-w-full text-center">
          <span>FREQ_ID: {roomName.padStart(4, '0')}</span>
          <span className="hidden sm:inline">|</span>
          <span>PROTO: WEB_RTC</span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline">ENC: AES-256</span>
        </div>
        <DisconnectButton className="w-full sm:w-auto min-h-[44px] border border-red-500/50 bg-black hover:bg-red-500 text-red-500 hover:text-black transition-all py-2 px-6 sm:px-10 tracking-[0.3em] uppercase text-[10px] font-bold">
          TERMINATE_LINK
        </DisconnectButton>
      </footer>
    </div>
  );
}
