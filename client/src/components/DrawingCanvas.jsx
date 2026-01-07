import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Pencil, Eraser, Trash2, Undo, Redo, Download, 
  Paintbrush, Droplets,
  ChevronDown, Lock
} from 'lucide-react';

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#008000', '#000080',
  '#FFD700', '#4B0082', '#00CED1', '#DC143C', '#228B22'
];

const BRUSH_SIZES = [2, 4, 8, 12, 20, 30, 50];

const DrawingCanvas = ({
  width = 800,
  height = 600,
  canDraw = true,
  showTools = true,
  collaborative = false,
  socket = null,
  lobbyId = null,
  odId = null,
  teamId = null,
  onStroke = null,
  onClear = null,
  externalStrokes = [],
  backgroundColor = '#FFFFFF'
}) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  
  // États du canvas
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pencil'); // pencil, eraser, fill
  const [color, setColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [opacity, setOpacity] = useState(100); // 0-100
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showOpacityPicker, setShowOpacityPicker] = useState(false);
  
  // Historique pour undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Points du trait en cours
  const currentStrokeRef = useRef([]);
  const lastPointRef = useRef({ x: 0, y: 0 });
  
  // Initialisation du canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;
    
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;
    
    // Fond blanc
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
    
    // Sauvegarder l'état initial
    saveToHistory();
  }, [width, height, backgroundColor]);
  
  // Convertir couleur hex en rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  // Mettre à jour le contexte quand les outils changent
  useEffect(() => {
    if (contextRef.current) {
      const alphaValue = opacity / 100;
      if (tool === 'eraser') {
        contextRef.current.globalAlpha = 1;
        contextRef.current.strokeStyle = backgroundColor;
        contextRef.current.lineWidth = brushSize * 3;
      } else {
        // Utiliser rgba pour la transparence plutôt que globalAlpha
        contextRef.current.globalAlpha = 1;
        contextRef.current.strokeStyle = hexToRgba(color, alphaValue);
        contextRef.current.lineWidth = brushSize;
      }
    }
  }, [color, brushSize, tool, backgroundColor, opacity]);
  
  // Écouter les strokes externes (mode collaboratif)
  useEffect(() => {
    if (externalStrokes.length > 0 && contextRef.current) {
      const lastStroke = externalStrokes[externalStrokes.length - 1];
      if (lastStroke && lastStroke.odId !== odId) {
        drawStroke(lastStroke);
      }
    }
  }, [externalStrokes, odId]);
  
  // Sauvegarder dans l'historique
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageData = canvas.toDataURL();
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);
  
  // Dessiner un trait reçu
  const drawStroke = useCallback((stroke) => {
    const ctx = contextRef.current;
    if (!ctx || !stroke.points || stroke.points.length < 2) return;
    
    ctx.save();
    ctx.strokeStyle = stroke.color || '#000000';
    ctx.lineWidth = stroke.width || 4;
    ctx.globalAlpha = stroke.opacity || 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    
    ctx.stroke();
    ctx.restore();
  }, []);
  
  // Flood Fill (pot de peinture)
  const floodFill = useCallback((startX, startY, fillColor) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!ctx || !canvas) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convertir la couleur de remplissage en RGBA
    const fillR = parseInt(fillColor.slice(1, 3), 16);
    const fillG = parseInt(fillColor.slice(3, 5), 16);
    const fillB = parseInt(fillColor.slice(5, 7), 16);
    const fillA = Math.round((opacity / 100) * 255);
    
    // Obtenir la couleur du pixel de départ
    const startPos = (Math.floor(startY) * canvas.width + Math.floor(startX)) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];
    
    // Si la couleur de départ est la même que la couleur de remplissage, ne rien faire
    if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) {
      return;
    }
    
    // Tolérance pour la comparaison des couleurs
    const tolerance = 32;
    
    const matchColor = (pos) => {
      return Math.abs(data[pos] - startR) <= tolerance &&
             Math.abs(data[pos + 1] - startG) <= tolerance &&
             Math.abs(data[pos + 2] - startB) <= tolerance &&
             Math.abs(data[pos + 3] - startA) <= tolerance;
    };
    
    const setColor = (pos) => {
      data[pos] = fillR;
      data[pos + 1] = fillG;
      data[pos + 2] = fillB;
      data[pos + 3] = fillA;
    };
    
    // Algorithme de flood fill avec pile (évite la récursion profonde)
    const stack = [[Math.floor(startX), Math.floor(startY)]];
    const visited = new Set();
    
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      
      const pos = (y * canvas.width + x) * 4;
      
      if (!matchColor(pos)) continue;
      
      visited.add(key);
      setColor(pos);
      
      // Ajouter les voisins
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
    
    ctx.putImageData(imageData, 0, 0);
    saveToHistory();
    
    // Notifier si collaboratif
    if (collaborative && socket) {
      socket.emit('drawing:fill', { lobbyId, teamId, odId, x: startX, y: startY, color: fillColor, opacity });
    }
  }, [opacity, collaborative, socket, lobbyId, teamId, odId, saveToHistory]);
  
  // Obtenir les coordonnées relatives au canvas
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };
  
  // Début du dessin
  const startDrawing = (e) => {
    if (!canDraw) return;
    e.preventDefault();
    
    const { x, y } = getCoordinates(e);
    
    // Si outil de remplissage, effectuer le flood fill
    if (tool === 'fill') {
      floodFill(x, y, color);
      return;
    }
    
    // Stocker le point de départ
    currentStrokeRef.current = [{ x, y }];
    lastPointRef.current = { x, y };
    setIsDrawing(true);
  };
  
  // Pendant le dessin
  const draw = (e) => {
    if (!isDrawing || !canDraw || tool === 'fill') return;
    e.preventDefault();
    
    const { x, y } = getCoordinates(e);
    const ctx = contextRef.current;
    
    // Dessiner un segment du dernier point au nouveau point
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Mettre à jour le dernier point
    lastPointRef.current = { x, y };
    currentStrokeRef.current.push({ x, y });
    
    // Envoyer en temps réel si collaboratif
    if (collaborative && socket && currentStrokeRef.current.length % 3 === 0) {
      const strokeData = {
        odId,
        teamId,
        lobbyId,
        points: [...currentStrokeRef.current],
        color: tool === 'eraser' ? backgroundColor : color,
        width: tool === 'eraser' ? brushSize * 3 : brushSize,
        opacity: opacity / 100,
        timestamp: Date.now()
      };
      socket.emit('drawing:stroke', strokeData);
    }
  };
  
  // Fin du dessin
  const finishDrawing = (e) => {
    if (!isDrawing) return;
    e?.preventDefault();
    
    contextRef.current.closePath();
    setIsDrawing(false);
    
    // Envoyer le trait complet
    if (currentStrokeRef.current.length > 0) {
      const strokeData = {
        odId,
        teamId,
        lobbyId,
        points: currentStrokeRef.current,
        color: tool === 'eraser' ? backgroundColor : color,
        width: tool === 'eraser' ? brushSize * 3 : brushSize,
        opacity: opacity / 100,
        timestamp: Date.now(),
        complete: true
      };
      
      if (collaborative && socket) {
        socket.emit('drawing:stroke', strokeData);
      }
      
      if (onStroke) {
        onStroke(strokeData);
      }
      
      saveToHistory();
    }
    
    currentStrokeRef.current = [];
  };
  
  // Effacer tout
  const clearCanvas = () => {
    const ctx = contextRef.current;
    ctx.globalAlpha = 1;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    saveToHistory();
    
    if (collaborative && socket) {
      socket.emit('drawing:clear', { lobbyId, teamId, odId });
    }
    
    if (onClear) {
      onClear();
    }
  };
  
  // Undo
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      const img = new Image();
      img.onload = () => {
        contextRef.current.globalAlpha = 1;
        contextRef.current.clearRect(0, 0, width, height);
        contextRef.current.drawImage(img, 0, 0);
      };
      img.src = history[historyIndex - 1];
    }
  };
  
  // Redo
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      const img = new Image();
      img.onload = () => {
        contextRef.current.globalAlpha = 1;
        contextRef.current.clearRect(0, 0, width, height);
        contextRef.current.drawImage(img, 0, 0);
      };
      img.src = history[historyIndex + 1];
    }
  };
  
  // Télécharger le dessin
  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `dessin-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  
  // Sélectionner une couleur
  const selectColor = (c) => {
    setColor(c);
    setCustomColor(c);
    setShowColorPicker(false);
  };
  
  // Fermer tous les pickers
  const closeAllPickers = () => {
    setShowColorPicker(false);
    setShowSizePicker(false);
    setShowOpacityPicker(false);
  };

  return (
    <div className="drawing-canvas-container" onClick={closeAllPickers}>
      {/* Barre d'outils */}
      {showTools && (
        <div className="flex flex-wrap items-center gap-2 mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg" onClick={(e) => e.stopPropagation()}>
          {/* Outils de base */}
          <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <button
              onClick={() => setTool('pencil')}
              className={`p-2 rounded-lg transition ${
                tool === 'pencil' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 dark:text-white'
              }`}
              title="Crayon"
            >
              <Pencil className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-lg transition ${
                tool === 'eraser' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 dark:text-white'
              }`}
              title="Gomme"
            >
              <Eraser className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTool('fill')}
              className={`p-2 rounded-lg transition ${
                tool === 'fill' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 dark:text-white'
              }`}
              title="Pot de peinture (remplissage)"
            >
              <Paintbrush className="w-5 h-5" />
            </button>
          </div>
          
          {/* Couleur */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); setShowSizePicker(false); setShowOpacityPicker(false); }}
              className="p-2 rounded-lg bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 flex items-center gap-1"
              title="Couleur"
            >
              <div 
                className="w-5 h-5 rounded border border-gray-400"
                style={{ backgroundColor: color }}
              />
              <ChevronDown className="w-3 h-3 dark:text-white" />
            </button>
            
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 w-56" onClick={(e) => e.stopPropagation()}>
                {/* Couleurs prédéfinies */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Couleurs prédéfinies</p>
                <div className="grid grid-cols-5 gap-1 mb-3">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => selectColor(c)}
                      className={`w-8 h-8 rounded border-2 transition hover:scale-110 ${
                        color === c ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                
                {/* Couleur personnalisée */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Couleur personnalisée</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setColor(e.target.value);
                    }}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                    title="Choisir une couleur"
                  />
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                        setCustomColor(val);
                        if (val.length === 7) setColor(val);
                      }
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-white"
                    placeholder="#000000"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Taille du pinceau */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowSizePicker(!showSizePicker); setShowColorPicker(false); setShowOpacityPicker(false); }}
              className="p-2 rounded-lg bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 flex items-center gap-1"
              title="Taille"
            >
              <div className="flex items-center justify-center w-5 h-5">
                <div 
                  className="rounded-full bg-gray-800 dark:bg-white"
                  style={{ width: Math.min(brushSize, 16), height: Math.min(brushSize, 16) }}
                />
              </div>
              <ChevronDown className="w-3 h-3 dark:text-white" />
            </button>
            
            {showSizePicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10" onClick={(e) => e.stopPropagation()}>
                {BRUSH_SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => { setBrushSize(size); setShowSizePicker(false); }}
                    className={`w-full px-3 py-1 rounded flex items-center gap-2 ${
                      brushSize === size 
                        ? 'bg-purple-100 dark:bg-purple-900' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div 
                      className="rounded-full bg-gray-800 dark:bg-white"
                      style={{ width: Math.min(size, 20), height: Math.min(size, 20) }}
                    />
                    <span className="text-sm dark:text-white">{size}px</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Opacité */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowOpacityPicker(!showOpacityPicker); setShowColorPicker(false); setShowSizePicker(false); }}
              className="p-2 rounded-lg bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 flex items-center gap-1"
              title="Opacité / Transparence"
            >
              <Droplets className="w-5 h-5 dark:text-white" />
              <span className="text-xs dark:text-white">{opacity}%</span>
            </button>
            
            {showOpacityPicker && (
              <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 w-48" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Opacité: {opacity}%</p>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between mt-2">
                  {[25, 50, 75, 100].map(val => (
                    <button
                      key={val}
                      onClick={() => setOpacity(val)}
                      className={`px-2 py-1 text-xs rounded ${
                        opacity === val 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-gray-200 dark:bg-gray-600 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Séparateur */}
          <div className="border-l border-gray-300 dark:border-gray-600 h-8" />
          
          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-lg bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
            title="Annuler"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
            title="Refaire"
          >
            <Redo className="w-5 h-5" />
          </button>
          
          {/* Séparateur */}
          <div className="border-l border-gray-300 dark:border-gray-600 h-8" />
          
          {/* Effacer tout */}
          <button
            onClick={clearCanvas}
            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
            title="Effacer tout"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          
          {/* Télécharger */}
          <button
            onClick={downloadCanvas}
            className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
            title="Télécharger"
          >
            <Download className="w-5 h-5" />
          </button>
          
          {/* Indicateur de permission */}
          {!canDraw && (
            <div className="ml-auto flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <Lock className="w-4 h-4" />
              <span className="text-sm">Lecture seule</span>
            </div>
          )}
        </div>
      )}
      
      {/* Canvas */}
      <div 
        className={`relative border-2 rounded-lg overflow-hidden ${
          canDraw 
            ? 'border-purple-500 dark:border-purple-400' 
            : 'border-gray-300 dark:border-gray-600'
        }`}
        style={{ 
          width: '100%', 
          maxWidth: width,
          aspectRatio: `${width}/${height}`
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={finishDrawing}
          onMouseLeave={finishDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={finishDrawing}
          className="w-full h-full touch-none"
          style={{ 
            cursor: canDraw 
              ? (tool === 'eraser' ? 'cell' : tool === 'fill' ? 'crosshair' : 'crosshair') 
              : 'not-allowed'
          }}
        />
        
        {/* Overlay si lecture seule */}
        {!canDraw && (
          <div className="absolute inset-0 bg-gray-500/10 flex items-center justify-center pointer-events-none">
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingCanvas;
