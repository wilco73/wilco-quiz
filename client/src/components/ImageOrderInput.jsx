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
 * Mélange déterministe (basé sur l'id de question) : l'ordre affiché est stable
 * tant qu'on reste sur la même question, mais différent d'un participant à l'autre
 * seulement si l'id change — ici on veut surtout éviter le re-shuffle à chaque render.
 * Retourne un tableau d'indices ORIGINAUX mélangés.
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
  // Éviter de tomber pile sur le bon ordre (0,1,2,...)
  const isIdentity = indices.every((v, i) => v === i);
  if (isIdentity && indices.length > 1) {
    indices.push(indices.shift());
  }
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
 * La réponse est la suite des indices d'origine dans l'ordre choisi, ex: "3|1|0|2".
 *
 * Props:
 * - question: { id, choices: [url, ...] }  (choices = images dans le BON ordre côté serveur)
 * - onAnswerChange: (str) => void
 * - disabled: bool (temps écoulé)
 */
export default function ImageOrderInput({ question, onAnswerChange, disabled = false }) {
  const images = question?.choices || [];

  // Ordre mélangé stable pour cette question
  const initialOrder = useMemo(
    () => shuffledOriginalIndices(images, question?.id || ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question?.id]
  );

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
        Glissez les images pour les remettre dans le bon ordre (position A → {LETTERS[order.length - 1]})
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order.map(String)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-3 sm:gap-4 justify-items-center">
            {order.map((origIndex, pos) => (
              <SortableImage
                key={origIndex}
                id={String(origIndex)}
                url={images[origIndex]}
                letter={LETTERS[pos]}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
