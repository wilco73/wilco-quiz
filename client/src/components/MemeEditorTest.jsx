import React, { useState } from 'react';
import MemeEditor from './MemeEditor';

/**
 * MemeEditorTest - Page de test pour l'éditeur de meme
 * À utiliser pendant le développement pour tester le composant
 */
export default function MemeEditorTest() {
  const [savedImage, setSavedImage] = useState(null);
  const [savedLayers, setSavedLayers] = useState(null);

  // Template de test (à remplacer par un vrai template de ta base)
  const testTemplate = {
    id: 1,
    title: 'Drake Hotline Bling',
    image_url: 'https://i.imgflip.com/30b1gx.jpg', // Drake meme classique
    width: 717,
    height: 717,
    preset_zones: [
      {
        x: 360,
        y: 50,
        width: 340,
        height: 80,
        rotation: 0,
        defaultFont: 'Impact',
        defaultSize: 28,
      },
      {
        x: 360,
        y: 400,
        width: 340,
        height: 80,
        rotation: 0,
        defaultFont: 'Impact',
        defaultSize: 28,
      },
    ],
  };

  // Alternative sans zones prédéfinies
  const testTemplate2 = {
    id: 2,
    title: 'Distracted Boyfriend',
    image_url: 'https://i.imgflip.com/1ur9b0.jpg',
    width: 800,
    height: 533,
    preset_zones: [],
  };

  const [currentTemplate, setCurrentTemplate] = useState(testTemplate);
  const [rotationsUsed, setRotationsUsed] = useState(0);
  const [undosUsed, setUndosUsed] = useState(0);
  const [templateHistory, setTemplateHistory] = useState([testTemplate]);

  const handleSave = (textLayers, finalImageBase64) => {
    console.log('Layers:', textLayers);
    console.log('Image base64 length:', finalImageBase64.length);
    setSavedLayers(textLayers);
    setSavedImage(finalImageBase64);
  };

  const handleRotate = () => {
    // Simuler une rotation (en vrai, ça appelle l'API pour un nouveau template)
    setTemplateHistory([...templateHistory, currentTemplate]);
    setCurrentTemplate(currentTemplate === testTemplate ? testTemplate2 : testTemplate);
    setRotationsUsed(rotationsUsed + 1);
  };

  const handleUndo = () => {
    if (templateHistory.length > 1) {
      const newHistory = [...templateHistory];
      const previousTemplate = newHistory.pop();
      setTemplateHistory(newHistory);
      setCurrentTemplate(previousTemplate);
      setUndosUsed(undosUsed + 1);
    }
  };

  const resetTest = () => {
    setSavedImage(null);
    setSavedLayers(null);
    setRotationsUsed(0);
    setUndosUsed(0);
    setCurrentTemplate(testTemplate);
    setTemplateHistory([testTemplate]);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">🎨 Test Éditeur de Meme</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentTemplate(testTemplate)}
            className={`px-3 py-1 rounded text-sm ${
              currentTemplate === testTemplate ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Template 1 (Drake)
          </button>
          <button
            onClick={() => setCurrentTemplate(testTemplate2)}
            className={`px-3 py-1 rounded text-sm ${
              currentTemplate === testTemplate2 ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Template 2 (Boyfriend)
          </button>
          <button
            onClick={resetTest}
            className="px-3 py-1 rounded text-sm bg-red-600 text-white"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Éditeur ou résultat */}
      {savedImage ? (
        <div className="p-8 flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold text-green-400">✅ Meme créé !</h2>
          
          <img 
            src={savedImage} 
            alt="Meme généré" 
            className="max-w-lg rounded-lg shadow-2xl"
          />
          
          <div className="bg-gray-800 rounded-lg p-4 max-w-lg w-full">
            <h3 className="text-sm font-bold text-gray-400 mb-2">Layers sauvegardés:</h3>
            <pre className="text-xs text-gray-300 overflow-auto max-h-40">
              {JSON.stringify(savedLayers, null, 2)}
            </pre>
          </div>

          <button
            onClick={resetTest}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Créer un autre meme
          </button>
        </div>
      ) : (
        <div className="h-[calc(100vh-64px)]">
          <MemeEditor
            template={currentTemplate}
            onSave={handleSave}
            onCancel={() => alert('Annulé')}
            maxRotations={3}
            maxUndos={1}
            rotationsUsed={rotationsUsed}
            undosUsed={undosUsed}
            onRotate={handleRotate}
            onUndo={handleUndo}
            canUndo={templateHistory.length > 1}
          />
        </div>
      )}
    </div>
  );
}
