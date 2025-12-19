import React from 'react';

// Liste des avatars disponibles avec leurs images
// Les images doivent être placées dans /public/avatars/ au format PNG 256x256
export const AVATARS = {
  // Basique
  default: { image: '/avatars/default.png', label: 'Défaut', category: 'Basique' },
  
  // Animaux
  cat: { image: '/avatars/cat.png', label: 'Chat', category: 'Animaux' },
  dog: { image: '/avatars/dog.png', label: 'Chien', category: 'Animaux' },
  fox: { image: '/avatars/fox.png', label: 'Renard', category: 'Animaux' },
  owl: { image: '/avatars/owl.png', label: 'Hibou', category: 'Animaux' },
  panda: { image: '/avatars/panda.png', label: 'Panda', category: 'Animaux' },
  rabbit: { image: '/avatars/rabbit.png', label: 'Lapin', category: 'Animaux' },
  bear: { image: '/avatars/bear.png', label: 'Ours', category: 'Animaux' },
  koala: { image: '/avatars/koala.png', label: 'Koala', category: 'Animaux' },
  lion: { image: '/avatars/lion.png', label: 'Lion', category: 'Animaux' },
  tiger: { image: '/avatars/tiger.png', label: 'Tigre', category: 'Animaux' },
  wolf: { image: '/avatars/wolf.png', label: 'Loup', category: 'Animaux' },
  penguin: { image: '/avatars/penguin.png', label: 'Pingouin', category: 'Animaux' },
  monkey: { image: '/avatars/monkey.png', label: 'Singe', category: 'Animaux' },
  elephant: { image: '/avatars/elephant.png', label: 'Éléphant', category: 'Animaux' },
  giraffe: { image: '/avatars/giraffe.png', label: 'Girafe', category: 'Animaux' },
  zebra: { image: '/avatars/zebra.png', label: 'Zèbre', category: 'Animaux' },
  deer: { image: '/avatars/deer.png', label: 'Cerf', category: 'Animaux' },
  squirrel: { image: '/avatars/squirrel.png', label: 'Écureuil', category: 'Animaux' },
  hedgehog: { image: '/avatars/hedgehog.png', label: 'Hérisson', category: 'Animaux' },
  
  // Personnages
  robot: { image: '/avatars/robot.png', label: 'Robot', category: 'Personnages' },
  alien: { image: '/avatars/alien.png', label: 'Alien', category: 'Personnages' },
  ghost: { image: '/avatars/ghost.png', label: 'Fantôme', category: 'Personnages' },
  ninja: { image: '/avatars/ninja.png', label: 'Ninja', category: 'Personnages' },
  pirate: { image: '/avatars/pirate.png', label: 'Pirate', category: 'Personnages' },
  wizard: { image: '/avatars/wizard.png', label: 'Sorcier', category: 'Personnages' },
  knight: { image: '/avatars/knight.png', label: 'Chevalier', category: 'Personnages' },
  astronaut: { image: '/avatars/astronaut.png', label: 'Astronaute', category: 'Personnages' },
  chef: { image: '/avatars/chef.png', label: 'Chef', category: 'Personnages' },
  detective: { image: '/avatars/detective.png', label: 'Détective', category: 'Personnages' },
};

// Obtenir les catégories uniques
export const AVATAR_CATEGORIES = [...new Set(Object.values(AVATARS).map(a => a.category))];

// Composant Avatar
const Avatar = ({ avatarId, size = 'md', className = '', showBorder = true }) => {
  const avatar = AVATARS[avatarId] || AVATARS.default;
  
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-24 h-24',
  };
  
  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        rounded-full 
        overflow-hidden
        flex items-center justify-center 
        bg-gradient-to-br from-purple-100 to-blue-100 
        dark:from-purple-900/50 dark:to-blue-900/50
        ${showBorder ? 'border-2 border-purple-300 dark:border-purple-600' : ''}
        ${className}
      `}
      title={avatar.label}
    >
      <img 
        src={avatar.image} 
        alt={avatar.label}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback si l'image n'existe pas encore
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = `<span class="text-2xl">👤</span>`;
        }}
      />
    </div>
  );
};

// Composant de sélection d'avatar
export const AvatarSelector = ({ selectedAvatar, onSelect, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {AVATAR_CATEGORIES.map(category => (
        <div key={category}>
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
            {category}
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(AVATARS)
              .filter(([_, data]) => data.category === category)
              .map(([id, data]) => (
                <button
                  key={id}
                  onClick={() => onSelect(id)}
                  className={`
                    w-14 h-14 rounded-full overflow-hidden
                    transition-all duration-200 hover:scale-110
                    flex items-center justify-center
                    ${selectedAvatar === id 
                      ? 'ring-3 ring-purple-500 ring-offset-2 dark:ring-offset-gray-800' 
                      : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'
                    }
                  `}
                  title={data.label}
                >
                  <img 
                    src={data.image} 
                    alt={data.label}
                    className="w-full h-full object-cover bg-gray-100 dark:bg-gray-700"
                    onError={(e) => {
                      // Fallback si l'image n'existe pas encore
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<span class="text-xl text-gray-400">${data.label.charAt(0)}</span>`;
                    }}
                  />
                </button>
              ))
            }
          </div>
        </div>
      ))}
    </div>
  );
};

export default Avatar;
