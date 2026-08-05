import React from 'react';

/**
 * BurgerBits - rendu partagé du menu Burger Quiz (utilisé par le scoreboard ET le buzzer).
 * Chaque élément apparaît quand le score atteint son point. Aspect naturel des PNG (pas d'écrasement),
 * couches espacées comme un burger "éclaté".
 */

const IMG = '/resources/burger/images';

// Burger : bas (1) -> haut (10)
const BURGER = ['base-burger', 'salad', 'base-meat', 'base-tomato', 'middle-burger', 'salad', 'cheese', 'top-meat', 'top-tomato', 'top-bread']
  .map((name, i) => ({ name, p: i + 1 }));

function Layer({ name, filled, w }) {
  return <img src={`${IMG}/${filled ? '' : 'empty-'}${name}.png`} alt="" style={{ width: w, height: 'auto', display: 'block' }} />;
}
// mayo/ketchup : pas de "empty-" individuel -> on grise
function Dim({ name, filled, w }) {
  return (
    <img src={`${IMG}/${name}.png`} alt="" style={{
      width: w, height: 'auto', display: 'block',
      filter: filled ? 'none' : 'grayscale(1) brightness(0.35)', opacity: filled ? 1 : 0.6,
    }} />
  );
}

export function TeamBurger({ points, w = 110 }) {
  const layers = [...BURGER].reverse(); // haut -> bas
  return (
    <div className="flex flex-col items-center" style={{ gap: Math.max(2, w * 0.035) }}>
      {layers.map((ing, i) => <Layer key={i} name={ing.name} filled={points >= ing.p} w={w} />)}
    </div>
  );
}

function Drink({ points, w = 66 }) {
  return (
    <div className="flex flex-col items-center" style={{ marginBottom: 0 }}>
      <Layer name="straw" filled={points >= 13} w={Math.round(w)} />
      <Layer name="top-cup" filled={points >= 12} w={w} />
      <Layer name="cup" filled={points >= 11} w={w} />
    </div>
  );
}

function Condiments({ points, w = 46 }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-end gap-1">
        <Dim name="tube-mayo" filled={points >= 15} w={Math.round(w * 0.34)} />
        <Dim name="tube-ketchup" filled={points >= 16} w={Math.round(w * 0.34)} />
      </div>
      <Layer name="salt-pepper" filled={points >= 14} w={w} />
    </div>
  );
}

function Fries({ points, w = 100 }) {
  const fries = Array.from({ length: 8 }, (_, i) => ({ name: `frie-${(i % 4) + 1}`, p: 18 + i }));
  const fw = Math.round(w * 0.13);
  const row = (arr, off) => (
    <div className="flex items-end justify-center gap-0.5">
      {arr.map((f, i) => <Layer key={i} name={f.name} filled={points >= f.p} w={fw} />)}
    </div>
  );
  return (
    <div className="flex flex-col items-center">
      {row(fries.slice(4, 8))}
      {row(fries.slice(0, 4))}
      <Layer name="bucket" filled={points >= 17} w={w} />
    </div>
  );
}

// Menu complet d'une équipe (burger + boisson + sauces + frites)
export function TeamMenu({ points, burgerW = 110 }) {
  return (
    <div className="flex items-end" style={{ gap: Math.round(burgerW * 0.16) }}>
      <TeamBurger points={points} w={burgerW} />
      <Drink points={points} w={Math.round(burgerW * 0.62)} />
      <Condiments points={points} w={Math.round(burgerW * 0.42)} />
      <Fries points={points} w={Math.round(burgerW * 0.92)} />
    </div>
  );
}
