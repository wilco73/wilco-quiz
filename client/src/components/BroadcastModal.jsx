import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, Volume2, VolumeX, Play, Pause } from 'lucide-react';

const BroadcastModal = ({ broadcast, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const { message, media, options = {}, senderPseudo } = broadcast || {};

  // Gérer l'autoplay
  useEffect(() => {
    if (media && options.autoplay) {
      if (media.type === 'video' && videoRef.current) {
        videoRef.current.volume = (options.volume || 80) / 100;
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else if (media.type === 'audio' && audioRef.current) {
        audioRef.current.volume = (options.volume || 80) / 100;
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  }, [media, options]);

  // Toggle play/pause
  const togglePlay = () => {
    const element = media?.type === 'video' ? videoRef.current : audioRef.current;
    if (element) {
      if (isPlaying) {
        element.pause();
      } else {
        element.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const element = media?.type === 'video' ? videoRef.current : audioRef.current;
    if (element) {
      element.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!broadcast) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-gradient-to-r from-purple-600 to-blue-600">
          <div className="text-white">
            <p className="text-sm opacity-80">Message de</p>
            <p className="font-bold">{senderPseudo || 'Animateur'}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Message texte */}
          {message && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <p className="text-lg dark:text-white whitespace-pre-wrap">{message}</p>
            </div>
          )}

          {/* Média */}
          {media && (
            <div className="rounded-xl overflow-hidden bg-black">
              {media.type === 'image' && (
                <img 
                  src={media.url} 
                  alt={media.name}
                  className="w-full max-h-[50vh] object-contain"
                />
              )}

              {media.type === 'video' && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    src={media.url}
                    className="w-full max-h-[50vh]"
                    loop={options.loop}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />
                  
                  {/* Contrôles vidéo */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-3">
                      <button onClick={togglePlay} className="text-white hover:text-blue-400">
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                      </button>
                      <button onClick={toggleMute} className="text-white hover:text-blue-400">
                        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                      </button>
                      <span className="text-white text-sm ml-auto">{media.name}</span>
                    </div>
                  </div>
                </div>
              )}

              {media.type === 'audio' && (
                <div className="p-6 bg-gradient-to-br from-purple-900 to-blue-900 text-white">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={togglePlay}
                      className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                    >
                      {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium">{media.name}</p>
                      <p className="text-sm opacity-70">Audio</p>
                    </div>
                    <button onClick={toggleMute} className="hover:text-blue-300">
                      {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </button>
                  </div>
                  <audio
                    ref={audioRef}
                    src={media.url}
                    loop={options.loop}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// Bouton pour revoir le dernier message
export const BroadcastReviewButton = ({ lastBroadcast, hasUnread, onClick }) => {
  if (!lastBroadcast) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all"
    >
      <Eye className="w-6 h-6" />
      
      {/* Badge notification */}
      {hasUnread && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
        </span>
      )}
    </button>
  );
};

// Hook pour gérer les broadcasts reçus
export const useBroadcastReceiver = (socket) => {
  const [currentBroadcast, setCurrentBroadcast] = useState(null);
  const [lastBroadcast, setLastBroadcast] = useState(null);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleBroadcast = (data) => {
      console.log('[BROADCAST] Reçu:', data);
      setCurrentBroadcast(data);
      setLastBroadcast(data);
      setHasUnread(true);
    };

    socket.on('broadcast:received', handleBroadcast);

    return () => {
      socket.off('broadcast:received', handleBroadcast);
    };
  }, [socket]);

  const closeBroadcast = () => {
    setCurrentBroadcast(null);
    setHasUnread(false);
  };

  const reviewLastBroadcast = () => {
    if (lastBroadcast) {
      setCurrentBroadcast(lastBroadcast);
      setHasUnread(false);
    }
  };

  return {
    currentBroadcast,
    lastBroadcast,
    hasUnread,
    closeBroadcast,
    reviewLastBroadcast
  };
};

export default BroadcastModal;
