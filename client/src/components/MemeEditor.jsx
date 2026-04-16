import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, Trash2, RotateCw, Move, Type, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, ChevronUp, ChevronDown, Download, Check, Undo
} from 'lucide-react';

/**
 * MemeEditor - Éditeur de meme avec drag & drop, rotation, redimensionnement
 * 
 * Props:
 * - template: { id, image_url, width, height, preset_zones }
 * - onSave: (textLayers, finalImageBase64) => void
 * - onCancel: () => void
 * - maxRotations: nombre max de changements d'image
 * - maxUndos: nombre max de retours en arrière
 * - rotationsUsed: nombre de rotations déjà utilisées
 * - undosUsed: nombre d'undos déjà utilisés
 * - onRotate: () => void - demander une nouvelle image
 * - onUndo: () => void - revenir à l'image précédente
 * - canUndo: boolean - si on peut faire undo
 */

// Liste des polices web-safe
const FONTS = [
  { name: 'Impact', value: 'Impact, Haettenschweiler, sans-serif' },
  { name: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { name: 'Arial Black', value: '"Arial Black", Gadget, sans-serif' },
  { name: 'Comic Sans MS', value: '"Comic Sans MS", cursive, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif' },
  { name: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { name: 'Courier New', value: '"Courier New", Courier, monospace' },
  { name: 'Lucida Console', value: '"Lucida Console", Monaco, monospace' },
];

// Texte par défaut
const DEFAULT_TEXT = {
  id: null,
  text: 'Votre texte',
  x: 50,
  y: 50,
  width: 200,
  height: 60,
  rotation: 0,
  fontSize: 32,
  fontFamily: 'Impact, Haettenschweiler, sans-serif',
  fontColor: '#FFFFFF',
  fontWeight: 'bold',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'center',
  strokeColor: '#000000',
  strokeWidth: 2,
};

export default function MemeEditor({
  template,
  onSave,
  onCancel,
  maxRotations = 3,
  maxUndos = 1,
  rotationsUsed = 0,
  undosUsed = 0,
  onRotate,
  onUndo,
  canUndo = false,
}) {
  // États
  const [textLayers, setTextLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);

  // Refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Charger les zones prédéfinies si présentes
  useEffect(() => {
    if (template?.preset_zones && template.preset_zones.length > 0) {
      const presetLayers = template.preset_zones.map((zone, index) => ({
        ...DEFAULT_TEXT,
        id: `text-${Date.now()}-${index}`,
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
        rotation: zone.rotation || 0,
        fontFamily: zone.defaultFont ? FONTS.find(f => f.name === zone.defaultFont)?.value || DEFAULT_TEXT.fontFamily : DEFAULT_TEXT.fontFamily,
        fontSize: zone.defaultSize || DEFAULT_TEXT.fontSize,
      }));
      setTextLayers(presetLayers);
      if (presetLayers.length > 0) {
        setSelectedLayerId(presetLayers[0].id);
      }
    }
  }, [template]);

  // Calculer l'échelle pour afficher l'image dans le conteneur
  useEffect(() => {
    if (containerRef.current && template) {
      const containerWidth = containerRef.current.clientWidth - 40; // padding
      const maxHeight = window.innerHeight - 300; // espace pour la toolbar
      
      const scaleX = containerWidth / template.width;
      const scaleY = maxHeight / template.height;
      const newScale = Math.min(scaleX, scaleY, 1); // Ne pas agrandir au-delà de 100%
      
      setScale(newScale);
    }
  }, [template, containerRef.current]);

  // Layer sélectionné
  const selectedLayer = textLayers.find(l => l.id === selectedLayerId);

  // Ajouter un nouveau texte
  const addTextLayer = () => {
    const newLayer = {
      ...DEFAULT_TEXT,
      id: `text-${Date.now()}`,
      x: template.width / 2 - 100,
      y: template.height / 2 - 30,
    };
    setTextLayers([...textLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  // Supprimer le texte sélectionné
  const deleteSelectedLayer = () => {
    if (!selectedLayerId) return;
    setTextLayers(textLayers.filter(l => l.id !== selectedLayerId));
    setSelectedLayerId(null);
  };

  // Mettre à jour une propriété du layer sélectionné
  const updateSelectedLayer = (updates) => {
    if (!selectedLayerId) return;
    setTextLayers(textLayers.map(l => 
      l.id === selectedLayerId ? { ...l, ...updates } : l
    ));
  };

  // Convertir coordonnées écran en coordonnées image
  const screenToImage = useCallback((screenX, screenY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.querySelector('.meme-canvas')?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    return {
      x: (screenX - rect.left) / scale,
      y: (screenY - rect.top) / scale,
    };
  }, [scale]);

  // Gérer le début du drag
  const handleMouseDown = (e, layerId, action = 'move') => {
    e.stopPropagation();
    setSelectedLayerId(layerId);
    
    const layer = textLayers.find(l => l.id === layerId);
    if (!layer) return;

    const { x, y } = screenToImage(e.clientX, e.clientY);

    if (action === 'move') {
      setIsDragging(true);
      setDragOffset({
        x: x - layer.x,
        y: y - layer.y,
      });
    } else if (action === 'resize') {
      setIsResizing(true);
      setDragOffset({ x, y, startWidth: layer.width, startHeight: layer.height });
    } else if (action === 'rotate') {
      setIsRotating(true);
      const centerX = layer.x + layer.width / 2;
      const centerY = layer.y + layer.height / 2;
      const startAngle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI;
      setDragOffset({ startAngle, startRotation: layer.rotation });
    }
  };

  // Gérer le mouvement
  const handleMouseMove = useCallback((e) => {
    if (!isDragging && !isResizing && !isRotating) return;
    if (!selectedLayerId) return;

    const { x, y } = screenToImage(e.clientX, e.clientY);
    const layer = textLayers.find(l => l.id === selectedLayerId);
    if (!layer) return;

    if (isDragging) {
      // Limiter aux bords de l'image
      const newX = Math.max(0, Math.min(template.width - layer.width, x - dragOffset.x));
      const newY = Math.max(0, Math.min(template.height - layer.height, y - dragOffset.y));
      updateSelectedLayer({ x: newX, y: newY });
    } else if (isResizing) {
      const deltaX = x - dragOffset.x;
      const deltaY = y - dragOffset.y;
      const newWidth = Math.max(50, dragOffset.startWidth + deltaX);
      const newHeight = Math.max(30, dragOffset.startHeight + deltaY);
      updateSelectedLayer({ width: newWidth, height: newHeight });
    } else if (isRotating) {
      const centerX = layer.x + layer.width / 2;
      const centerY = layer.y + layer.height / 2;
      const currentAngle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI;
      const deltaAngle = currentAngle - dragOffset.startAngle;
      let newRotation = (dragOffset.startRotation + deltaAngle) % 360;
      updateSelectedLayer({ rotation: newRotation });
    }
  }, [isDragging, isResizing, isRotating, selectedLayerId, dragOffset, textLayers, template, scale]);

  // Fin du drag
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
  }, []);

  // Event listeners globaux
  useEffect(() => {
    if (isDragging || isResizing || isRotating) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, isRotating, handleMouseMove, handleMouseUp]);

  // Fonction pour wrapper le texte selon la largeur
  const wrapText = (ctx, text, maxWidth) => {
    // D'abord séparer par les retours à la ligne explicites
    const paragraphs = text.split('\n');
    const allLines = [];

    paragraphs.forEach(paragraph => {
      const words = paragraph.split(' ');
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
          allLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });

      if (currentLine) {
        allLines.push(currentLine);
      }
      // Si le paragraphe était vide (double retour à la ligne), ajouter une ligne vide
      if (paragraph === '') {
        allLines.push('');
      }
    });

    return allLines;
  };

  // Générer l'image finale
  const generateFinalImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = template.width;
    canvas.height = template.height;
    const ctx = canvas.getContext('2d');

    // Dessiner l'image de fond
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, template.width, template.height);

        // Dessiner chaque texte
        textLayers.forEach(layer => {
          ctx.save();
          
          // Appliquer rotation
          const centerX = layer.x + layer.width / 2;
          const centerY = layer.y + layer.height / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate(layer.rotation * Math.PI / 180);
          ctx.translate(-centerX, -centerY);

          // Configuration du texte
          let fontStyle = '';
          if (layer.fontWeight === 'bold') fontStyle += 'bold ';
          if (layer.fontStyle === 'italic') fontStyle += 'italic ';
          ctx.font = `${fontStyle}${layer.fontSize}px ${layer.fontFamily}`;
          ctx.textAlign = layer.textAlign || 'center';
          ctx.textBaseline = 'top';

          // Position du texte
          let textX = layer.x;
          if (layer.textAlign === 'center') textX = layer.x + layer.width / 2;
          else if (layer.textAlign === 'right') textX = layer.x + layer.width;

          // Wrapper le texte selon la largeur de la zone
          const lines = wrapText(ctx, layer.text, layer.width);
          const lineHeight = layer.fontSize * 1.2;
          const totalTextHeight = lines.length * lineHeight;
          
          // Centrer verticalement dans la zone
          let startY = layer.y + (layer.height - totalTextHeight) / 2;

          // Dessiner chaque ligne
          lines.forEach((line, lineIndex) => {
            const lineY = startY + lineIndex * lineHeight;

            // Dessiner le contour
            if (layer.strokeWidth > 0) {
              ctx.strokeStyle = layer.strokeColor;
              ctx.lineWidth = layer.strokeWidth * 2;
              ctx.lineJoin = 'round';
              ctx.strokeText(line, textX, lineY);
            }

            // Dessiner le texte
            ctx.fillStyle = layer.fontColor;
            ctx.fillText(line, textX, lineY);

            // Appliquer les décorations
            if (layer.textDecoration === 'underline' || layer.textDecoration === 'line-through') {
              const metrics = ctx.measureText(line);
              let decoY = lineY + layer.fontSize * 0.85;
              if (layer.textDecoration === 'line-through') {
                decoY = lineY + layer.fontSize * 0.5;
              }
              
              let decoStartX = textX;
              if (layer.textAlign === 'center') decoStartX = textX - metrics.width / 2;
              else if (layer.textAlign === 'right') decoStartX = textX - metrics.width;
              
              ctx.beginPath();
              ctx.strokeStyle = layer.fontColor;
              ctx.lineWidth = Math.max(2, layer.fontSize / 15);
              ctx.moveTo(decoStartX, decoY);
              ctx.lineTo(decoStartX + metrics.width, decoY);
              ctx.stroke();
            }
          });

          ctx.restore();
        });

        // Convertir en base64
        const base64 = canvas.toDataURL('image/png');
        resolve(base64);
      };
      img.onerror = reject;
      img.src = template.image_url;
    });
  };

  // Sauvegarder
  const handleSave = async () => {
    try {
      const finalImage = await generateFinalImage();
      onSave(textLayers, finalImage);
    } catch (error) {
      console.error('Erreur génération image:', error);
      alert('Erreur lors de la génération de l\'image');
    }
  };

  // Désélectionner si clic sur le fond
  const handleCanvasClick = (e) => {
    if (e.target === e.currentTarget) {
      setSelectedLayerId(null);
    }
  };

  if (!template) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Aucun template sélectionné</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-2 flex flex-wrap items-center gap-2">
        {/* Actions principales */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
          <button
            onClick={addTextLayer}
            className="p-2 hover:bg-gray-700 rounded text-white flex items-center gap-1"
            title="Ajouter un texte"
          >
            <Plus className="w-4 h-4" />
            <Type className="w-4 h-4" />
          </button>
          <button
            onClick={deleteSelectedLayer}
            disabled={!selectedLayerId}
            className="p-2 hover:bg-gray-700 rounded text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Supprimer le texte"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Rotation/Undo image */}
        {(onRotate || onUndo) && (
          <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
            {onRotate && (
              <button
                onClick={onRotate}
                disabled={rotationsUsed >= maxRotations}
                className="p-2 hover:bg-gray-700 rounded text-yellow-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                title={`Changer d'image (${maxRotations - rotationsUsed} restants)`}
              >
                <RotateCw className="w-4 h-4" />
                <span>{maxRotations - rotationsUsed}</span>
              </button>
            )}
            {onUndo && (
              <button
                onClick={onUndo}
                disabled={!canUndo || undosUsed >= maxUndos}
                className="p-2 hover:bg-gray-700 rounded text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                title={`Revenir à l'image précédente (${maxUndos - undosUsed} restants)`}
              >
                <Undo className="w-4 h-4" />
                <span>{maxUndos - undosUsed}</span>
              </button>
            )}
          </div>
        )}

        {/* Police */}
        {selectedLayer && (
          <>
            <select
              value={selectedLayer.fontFamily}
              onChange={(e) => updateSelectedLayer({ fontFamily: e.target.value })}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
            >
              {FONTS.map(font => (
                <option key={font.name} value={font.value} style={{ fontFamily: font.value }}>
                  {font.name}
                </option>
              ))}
            </select>

            {/* Taille */}
            <input
              type="number"
              value={selectedLayer.fontSize}
              onChange={(e) => updateSelectedLayer({ fontSize: parseInt(e.target.value) || 12 })}
              className="w-16 bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
              min="8"
              max="200"
            />

            {/* Couleur texte */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">A</span>
              <input
                type="color"
                value={selectedLayer.fontColor}
                onChange={(e) => updateSelectedLayer({ fontColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0"
                title="Couleur du texte"
              />
            </div>

            {/* Couleur contour */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">⬜</span>
              <input
                type="color"
                value={selectedLayer.strokeColor}
                onChange={(e) => updateSelectedLayer({ strokeColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0"
                title="Couleur du contour"
              />
              <input
                type="number"
                value={selectedLayer.strokeWidth}
                onChange={(e) => updateSelectedLayer({ strokeWidth: parseInt(e.target.value) || 0 })}
                className="w-12 bg-gray-700 text-white text-sm rounded px-1 py-1 border border-gray-600"
                min="0"
                max="20"
                title="Épaisseur du contour"
              />
            </div>

            {/* Style */}
            <div className="flex items-center border-l border-gray-700 pl-2">
              <button
                onClick={() => updateSelectedLayer({ 
                  fontWeight: selectedLayer.fontWeight === 'bold' ? 'normal' : 'bold' 
                })}
                className={`p-2 rounded ${selectedLayer.fontWeight === 'bold' ? 'bg-purple-600' : 'hover:bg-gray-700'}`}
                title="Gras"
              >
                <Bold className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => updateSelectedLayer({ 
                  fontStyle: selectedLayer.fontStyle === 'italic' ? 'normal' : 'italic' 
                })}
                className={`p-2 rounded ${selectedLayer.fontStyle === 'italic' ? 'bg-purple-600' : 'hover:bg-gray-700'}`}
                title="Italique"
              >
                <Italic className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => updateSelectedLayer({ 
                  textDecoration: selectedLayer.textDecoration === 'underline' ? 'none' : 'underline' 
                })}
                className={`p-2 rounded ${selectedLayer.textDecoration === 'underline' ? 'bg-purple-600' : 'hover:bg-gray-700'}`}
                title="Souligné"
              >
                <Underline className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => updateSelectedLayer({ 
                  textDecoration: selectedLayer.textDecoration === 'line-through' ? 'none' : 'line-through' 
                })}
                className={`p-2 rounded ${selectedLayer.textDecoration === 'line-through' ? 'bg-purple-600' : 'hover:bg-gray-700'}`}
                title="Barré"
              >
                <Strikethrough className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Alignement */}
            <div className="flex items-center border-l border-gray-700 pl-2">
              <button
                onClick={() => updateSelectedLayer({ textAlign: 'left' })}
                className={`p-2 rounded ${selectedLayer.textAlign === 'left' ? 'bg-purple-600' : 'hover:bg-gray-700'}`}
                title="Aligner à gauche"
              >
                <AlignLeft className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => updateSelectedLayer({ textAlign: 'center' })}
                className={`p-2 rounded ${selectedLayer.textAlign === 'center' ? 'bg-purple-600' : 'hover:bg-gray-700'}`}
                title="Centrer"
              >
                <AlignCenter className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => updateSelectedLayer({ textAlign: 'right' })}
                className={`p-2 rounded ${selectedLayer.textAlign === 'right' ? 'bg-purple-600' : 'hover:bg-gray-700'}`}
                title="Aligner à droite"
              >
                <AlignRight className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Rotation du texte */}
            <div className="flex items-center border-l border-gray-700 pl-2 gap-1">
              <RotateCw className="w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={Math.round(selectedLayer.rotation)}
                onChange={(e) => updateSelectedLayer({ rotation: parseInt(e.target.value) || 0 })}
                className="w-16 bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
                min="-180"
                max="180"
              />
              <span className="text-xs text-gray-400">°</span>
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions finales */}
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
            >
              Annuler
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Check className="w-4 h-4" />
            Valider
          </button>
        </div>
      </div>

      {/* Zone d'édition */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-950"
      >
        <div 
          className="meme-canvas relative bg-gray-800 shadow-2xl"
          style={{
            width: template.width * scale,
            height: template.height * scale,
          }}
          onClick={handleCanvasClick}
        >
          {/* Image de fond */}
          <img
            ref={imageRef}
            src={template.image_url}
            alt="Meme template"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            crossOrigin="anonymous"
            onLoad={() => setImageLoaded(true)}
          />

          {/* Textes */}
          {imageLoaded && textLayers.map(layer => (
            <div
              key={layer.id}
              className={`absolute cursor-move select-none ${
                layer.id === selectedLayerId 
                  ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent' 
                  : 'hover:ring-2 hover:ring-white/50'
              }`}
              style={{
                left: layer.x * scale,
                top: layer.y * scale,
                width: layer.width * scale,
                height: layer.height * scale,
                transform: `rotate(${layer.rotation}deg)`,
                transformOrigin: 'center center',
              }}
              onMouseDown={(e) => handleMouseDown(e, layer.id, 'move')}
            >
              {/* Zone de texte éditable */}
              {layer.id === selectedLayerId ? (
                <textarea
                  value={layer.text}
                  onChange={(e) => updateSelectedLayer({ text: e.target.value })}
                  className="w-full h-full bg-transparent resize-none outline-none text-center flex items-center justify-center p-1"
                  style={{
                    fontFamily: layer.fontFamily,
                    fontSize: layer.fontSize * scale,
                    fontWeight: layer.fontWeight,
                    fontStyle: layer.fontStyle,
                    textDecoration: layer.textDecoration,
                    textAlign: layer.textAlign,
                    color: layer.fontColor,
                    WebkitTextStroke: `${layer.strokeWidth}px ${layer.strokeColor}`,
                    paintOrder: 'stroke fill',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center p-1 overflow-hidden"
                  style={{
                    fontFamily: layer.fontFamily,
                    fontSize: layer.fontSize * scale,
                    fontWeight: layer.fontWeight,
                    fontStyle: layer.fontStyle,
                    textDecoration: layer.textDecoration,
                    textAlign: layer.textAlign,
                    color: layer.fontColor,
                    WebkitTextStroke: `${layer.strokeWidth}px ${layer.strokeColor}`,
                    paintOrder: 'stroke fill',
                  }}
                >
                  {layer.text}
                </div>
              )}

              {/* Poignées de redimensionnement et rotation (seulement si sélectionné) */}
              {layer.id === selectedLayerId && (
                <>
                  {/* Poignée de redimensionnement (coin bas-droit) */}
                  <div
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full cursor-se-resize border-2 border-white shadow-lg"
                    onMouseDown={(e) => handleMouseDown(e, layer.id, 'resize')}
                  />
                  
                  {/* Poignée de rotation (en haut) */}
                  <div
                    className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-400 rounded-full cursor-grab border-2 border-white shadow-lg flex items-center justify-center"
                    onMouseDown={(e) => handleMouseDown(e, layer.id, 'rotate')}
                  >
                    <RotateCw className="w-2 h-2 text-white" />
                  </div>
                  
                  {/* Ligne vers la poignée de rotation */}
                  <div className="absolute -top-4 left-1/2 w-0.5 h-4 bg-blue-400 transform -translate-x-1/2" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-xs text-gray-400 flex items-center justify-center gap-4">
        <span>🖱️ Glisser pour déplacer</span>
        <span>⚪ Coin jaune = redimensionner</span>
        <span>🔵 Haut = rotation</span>
        <span>📝 Cliquer pour éditer le texte</span>
      </div>
    </div>
  );
}
