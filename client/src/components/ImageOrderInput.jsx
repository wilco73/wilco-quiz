import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/**
 * Fallback local (utilisé seulement si le serveur n'a pas fourni displayOrder).
 * Déterministe par seed pour rester cohérent entre clients.
 */
function shuffledOriginalIndices(images, seedStr) {
  const indices = images.map((_, i) => i);
  let s = 0;
  for (let k = 0; k < (seedStr || '').length; k++) s = (s * 31 + seedStr.charCodeAt(k)) >>> 0;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const isIdentity = indices.every((v, i) => v === i);
  if (isIdentity && indices.length > 1) indices.push(indices.shift());
  return indices;
}

function SortableImage({ id, url, letter, disabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex flex-col items-center gap-1.5 select-none ${
        disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'z-10' : ''}`}
    >
      <img
        src={url}
        alt={`Image ${letter}`}
        draggable={false}
        className="w-full max-w-[110px] sm:max-w-[140px] max-h-28 sm:max-h-36 object-contain rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm"
        onError={(e) => { e.target.style.visibility = 'hidden'; }}
      />
      <span className="w-7 h-7 flex items-center justify-center rounded-full bg-purple-600 text-white text-sm font-bold shadow">
        {letter}
      </span>
    </div>
  );
}

/**
 * ImageOrderInput - réordonnancement d'images en drag & drop (PC + mobile).
 *
 * - L'ordre de départ vient du SERVEUR (question.displayOrder) => identique pour tous les
 *   participants (essentiel pour se coordonner en équipe). Fallback local si absent.
 * - Chaque image garde une LETTRE FIXE (A, B, C…) attribuée selon l'ordre de départ ;
 *   la lettre suit l'image quand on la déplace (elle ne change pas de place).
 *   => un joueur peut dire "le bon ordre c'est C, B, D, E, A" et tout le monde comprend.
 *
 * La réponse envoyée est la suite des indices d'origine dans l'ordre choisi, ex "3|1|0|2".
 */
export default function ImageOrderInput({ question, onAnswerChange, disabled = false }) {
  const images = question?.choices || [];

  // Ordre initial : priorité au serveur (partagé), sinon fallback local déterministe
  const initialOrder = useMemo(() => {
    const fromServer = question?.displayOrder;
    if (Array.isArray(fromServer) && fromServer.length === images.length && images.length > 0) {
      return fromServer.slice();
    }
    return shuffledOriginalIndices(images, question?.id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id]);

  // Lettre PERMANENTE par image = sa position dans l'ordre initial (ne bouge plus ensuite)
  const letterByOrig = useMemo(() => {
    const map = {};
    initialOrder.forEach((origIndex, pos) => { map[origIndex] = LETTERS[pos]; });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrder]);

  const [order, setOrder] = useState(initialOrder);

  // Réinitialiser + enregistrer l'ordre de départ à chaque changement de question
  useEffect(() => {
    setOrder(initialOrder);
    onAnswerChange(initialOrder.join('|'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(Number(active.id));
      const newIndex = prev.indexOf(Number(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      onAnswerChange(next.join('|'));
      return next;
    });
  };

  if (images.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400">Aucune image à classer.</p>;
  }

  return (
    <div>
      <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-3">
        Glissez les images pour les remettre dans le bon ordre — la lettre reste attachée à chaque image.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order.map(String)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-3 sm:gap-4 justify-items-center">
            {order.map((origIndex) => (
              <SortableImage
                key={origIndex}
                id={String(origIndex)}
                url={images[origIndex]}
                letter={letterByOrig[origIndex]}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
