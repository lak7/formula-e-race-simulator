import React from 'react';

interface Track {
  id: string;
  name: string;
  file: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  length: number;
  corners: number;
  drsZones: number;
}

interface TrackSelectorProps {
  onTrackSelect: (trackFile: string) => void;
  selectedTrack?: string;
}

const tracks: Track[] = [
  {
    id: 'monaco',
    name: 'Monaco Circuit',
    file: '/sample-track.json',
    description: 'Classic street circuit with tight corners and narrow streets',
    difficulty: 'Hard',
    length: 3337,
    corners: 11,
    drsZones: 2
  },
  {
    id: 'singapore',
    name: 'Singapore Street Circuit',
    file: '/tracks/singapore-circuit.json',
    description: 'Challenging night race with complex technical sections',
    difficulty: 'Hard',
    length: 5063,
    corners: 23,
    drsZones: 2
  },
  {
    id: 'monza',
    name: 'Monza High Speed Circuit',
    file: '/tracks/monza-circuit.json',
    description: 'Temple of speed with long straights and fast corners',
    difficulty: 'Medium',
    length: 5793,
    corners: 11,
    drsZones: 4
  },
  {
    id: 'suzuka',
    name: 'Suzuka Figure-8 Circuit',
    file: '/tracks/suzuka-circuit.json',
    description: 'Unique figure-8 layout with high-speed corners',
    difficulty: 'Hard',
    length: 5807,
    corners: 18,
    drsZones: 1
  },
  {
    id: 'baku',
    name: 'Baku City Circuit',
    file: '/tracks/baku-city-circuit.json',
    description: 'Ultra-long straight with narrow castle section',
    difficulty: 'Medium',
    length: 6003,
    corners: 20,
    drsZones: 2
  }
];

const TrackSelector: React.FC<TrackSelectorProps> = ({ onTrackSelect, selectedTrack }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Select Track</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedTrack === track.file
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onTrackSelect(track.file)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-800">{track.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(track.difficulty)}`}>
                {track.difficulty}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{track.description}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium text-gray-700">{track.length}m</div>
                <div className="text-gray-500">Length</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-700">{track.corners}</div>
                <div className="text-gray-500">Corners</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-700">{track.drsZones}</div>
                <div className="text-gray-500">DRS</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackSelector;
