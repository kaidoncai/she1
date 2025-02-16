'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';

type Position = {
  x: number;
  y: number;
};

type ScoreRecord = {
  score: number;
  date: string;
};

// 修改音效组配置
const SOUND_PACKS = [
  {
    name: '解压音效',
    eat: 'https://freesound.org/data/previews/240/240776_4284968-lq.mp3',    // 软糖咀嚼声
    crash: 'https://freesound.org/data/previews/240/240777_4284968-lq.mp3',  // 轻柔碰撞声
    applause: 'https://freesound.org/data/previews/240/240778_4284968-lq.mp3', // 轻松胜利声
    cheer: 'https://freesound.org/data/previews/240/240779_4284968-lq.mp3'   // 愉悦加油声
  },
  {
    name: '治愈音效',
    eat: 'https://freesound.org/data/previews/242/242857_4284968-lq.mp3',    // 软萌吃东西声
    crash: 'https://freesound.org/data/previews/242/242858_4284968-lq.mp3',  // 轻柔碰撞声
    applause: 'https://freesound.org/data/previews/242/242859_4284968-lq.mp3', // 温暖欢呼声
    cheer: 'https://freesound.org/data/previews/242/242860_4284968-lq.mp3'   // 治愈鼓励声
  },
  {
    name: 'ASMR音效',
    eat: 'https://assets.mixkit.co/active_storage/sfx/2581/2581-preview.mp3',    // 清脆的咀嚼声
    crash: 'https://assets.mixkit.co/active_storage/sfx/2580/2580-preview.mp3',  // 柔和的撞击声
    applause: 'https://assets.mixkit.co/active_storage/sfx/2582/2582-preview.mp3', // 舒缓的胜利音效
    cheer: 'https://assets.mixkit.co/active_storage/sfx/2583/2583-preview.mp3'   // 轻声的鼓励
  }
];

export default function Snake() {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position | null>(null);
  const [direction, setDirection] = useState<string>('right');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highScores, setHighScores] = useState<ScoreRecord[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSoundPack, setCurrentSoundPack] = useState(0);

  // 音频引用
  const eatSound = useRef<HTMLAudioElement | null>(null);
  const crashSound = useRef<HTMLAudioElement | null>(null);
  const applauseSound = useRef<HTMLAudioElement | null>(null);
  const cheerSound = useRef<HTMLAudioElement | null>(null);

  // 修改音效初始化，调整音量以获得更好的解压效果
  useEffect(() => {
    const pack = SOUND_PACKS[currentSoundPack];
    
    // 吃食物音效 - 音量适中，让咀嚼声更清晰
    eatSound.current = new Audio(pack.eat);
    eatSound.current.volume = 0.5;

    // 撞墙音效 - 音量稍小，避免太突兀
    crashSound.current = new Audio(pack.crash);
    crashSound.current.volume = 0.4;

    // 破纪录音效 - 音量适中，营造愉悦感
    applauseSound.current = new Audio(pack.applause);
    applauseSound.current.volume = 0.5;

    // 加油音效 - 音量适中，保持温和
    cheerSound.current = new Audio(pack.cheer);
    cheerSound.current.volume = 0.5;
  }, [currentSoundPack]);

  // 修改音频播放函数，添加错误处理和重试机制
  const playSound = useCallback(async (sound: HTMLAudioElement | null) => {
    if (sound && !isMuted) {
      try {
        sound.currentTime = 0;
        await sound.play();
      } catch (err) {
        console.log('音效播放失败:', err);
      }
    }
  }, [isMuted]);

  // 生成食物
  const generateFood = useCallback(() => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * 20),
        y: Math.floor(Math.random() * 20)
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    setFood(newFood);
  }, [snake]);

  // 移动蛇
  const moveSnake = useCallback(() => {
    if (gameOver || !isPlaying) return;

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };

      switch (direction) {
        case 'up':
          head.y = (head.y - 1 + 20) % 20;
          break;
        case 'down':
          head.y = (head.y + 1) % 20;
          break;
        case 'left':
          head.x = (head.x - 1 + 20) % 20;
          break;
        case 'right':
          head.x = (head.x + 1) % 20;
          break;
      }

      // 检查是否撞到自己
      if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        handleGameOver();
        return prevSnake;
      }

      // 检查是否吃到食物
      if (food && head.x === food.x && head.y === food.y) {
        // 立即播放吃食物音效
        playSound(eatSound.current);
        setScore(prev => prev + 10);
        generateFood();
      } else {
        newSnake.pop();
      }

      return [head, ...newSnake];
    });
  }, [direction, food, gameOver, generateFood, isPlaying]);

  // 计算蛇头旋转角度
  const getHeadRotation = () => {
    switch (direction) {
      case 'up': return -90;
      case 'down': return 90;
      case 'left': return 180;
      case 'right': return 0;
      default: return 0;
    }
  };

  // 修改游戏结束处理函数，优化音效播放时序
  const handleGameOver = useCallback(() => {
    setGameOver(true);
    setIsPlaying(false);
    
    // 停止所有音效
    const stopAllAudio = () => {
      [eatSound, crashSound, applauseSound, cheerSound].forEach(sound => {
        if (sound.current) {
          sound.current.pause();
          sound.current.currentTime = 0;
        }
      });
    };

    stopAllAudio();
    playSound(crashSound.current);

    setTimeout(() => {
      const currentHighScore = highScores.length > 0 ? highScores[0].score : 0;
      if (score > currentHighScore) {
        playSound(applauseSound.current);
      } else {
        playSound(cheerSound.current);
      }
    }, 800);

    if (score > 0) {
      setShowNameInput(true);
    }
  }, [score, highScores, playSound]);

  // 修改开始新游戏函数
  const startNewGame = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection('right');
    setGameOver(false);
    setScore(0);
    setIsPlaying(true);
    generateFood();
    setShowNameInput(false);
    
    // 确保所有音效都停止并重置
    [eatSound, crashSound, applauseSound, cheerSound].forEach(sound => {
      if (sound.current) {
        sound.current.pause();
        sound.current.currentTime = 0;
      }
    });
  }, [generateFood]);

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying) {
        if (e.key === 'Enter') {
          startNewGame();
          return;
        }
      }

      switch (e.key) {
        case 'ArrowUp':
          if (direction !== 'down') setDirection('up');
          break;
        case 'ArrowDown':
          if (direction !== 'up') setDirection('down');
          break;
        case 'ArrowLeft':
          if (direction !== 'right') setDirection('left');
          break;
        case 'ArrowRight':
          if (direction !== 'left') setDirection('right');
          break;
        case ' ':  // 空格键暂停/继续
          setIsPlaying(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [direction, isPlaying]);

  // 游戏循环
  useEffect(() => {
    const gameInterval = setInterval(moveSnake, 150);
    return () => clearInterval(gameInterval);
  }, [moveSnake]);

  // 加载历史最高分
  useEffect(() => {
    const savedScores = localStorage.getItem('snakeHighScores');
    if (savedScores) {
      setHighScores(JSON.parse(savedScores));
    }
  }, []);

  // 保存新的分数记录
  const saveScore = () => {
    const newScore: ScoreRecord = {
      score,
      date: new Date().toLocaleString()
    };
    
    const updatedScores = [...highScores, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setHighScores(updatedScores);
    localStorage.setItem('snakeHighScores', JSON.stringify(updatedScores));
    setShowNameInput(false);
  };

  // 修改音量控制的 useEffect
  const handleAudioMute = useCallback(() => {
    [eatSound, crashSound, applauseSound, cheerSound].forEach(sound => {
      if (sound.current) {
        sound.current.muted = isMuted;
      }
    });
  }, [isMuted]);

  // 使用 useEffect 调用 handleAudioMute
  useEffect(() => {
    handleAudioMute();
  }, [handleAudioMute]);

  // 添加音量控制函数
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // 添加切换音效函数
  const switchSoundPack = useCallback(() => {
    const nextPack = (currentSoundPack + 1) % SOUND_PACKS.length;
    setCurrentSoundPack(nextPack);
  }, [currentSoundPack]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* 音效控制按钮组 */}
      <div className="fixed top-4 left-4 z-10 flex flex-col gap-2">
        <button
          onClick={toggleMute}
          className="bg-gray-800/90 p-3 rounded-lg hover:bg-gray-700/90 transition-colors flex items-center gap-2"
        >
          {isMuted ? (
            <>
              <span className="text-xl">🔇</span>
              <span className="text-red-400 text-sm">音效已关闭</span>
            </>
          ) : (
            <>
              <span className="text-xl">🔊</span>
              <span className="text-green-400 text-sm">音效已开启</span>
            </>
          )}
        </button>

        {!isMuted && (
          <button
            onClick={switchSoundPack}
            className="bg-gray-800/90 p-3 rounded-lg hover:bg-gray-700/90 transition-colors flex items-center gap-2"
          >
            <span className="text-xl">🎵</span>
            <div className="flex flex-col">
              <span className="text-blue-400 text-sm">切换音效</span>
              <span className="text-gray-400 text-xs">{SOUND_PACKS[currentSoundPack].name}</span>
            </div>
          </button>
        )}
      </div>

      {/* 标题区域 */}
      <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
        贪吃蛇游戏
      </h1>

      {/* 游戏信息区域 */}
      <div className="mb-6 flex items-center gap-8">
        <div className="bg-gray-800 px-6 py-3 rounded-lg shadow-lg">
          <span className="text-gray-400 mr-2">分数:</span>
          <span className="text-2xl font-bold text-green-400">{score}</span>
        </div>
        {!isPlaying && !gameOver && (
          <div className="animate-pulse text-yellow-400 bg-yellow-900/30 px-4 py-2 rounded-md">
            按 Enter 开始游戏
          </div>
        )}
        {isPlaying && (
          <div className="text-green-400 bg-green-900/30 px-4 py-2 rounded-md">
            游戏进行中
          </div>
        )}
      </div>

      {/* 游戏区域 */}
      <div className="relative w-[400px] h-[400px] border-2 border-gray-700 rounded-lg bg-gray-800/50 shadow-xl backdrop-blur-sm overflow-hidden">
        {/* 网格背景 */}
        <div className="absolute inset-0 grid grid-cols-20 grid-rows-20 gap-px opacity-10">
          {Array.from({ length: 400 }).map((_, i) => (
            <div key={i} className="bg-gray-500" />
          ))}
        </div>
        
        {/* 食物 */}
        {food && (
          <div
            className="absolute w-5 h-5 bg-gradient-to-br from-red-400 to-red-600 rounded-full shadow-lg transform scale-pulse"
            style={{
              left: `${food.x * 20}px`,
              top: `${food.y * 20}px`,
              animation: 'pulse 2s infinite',
            }}
          />
        )}
        
        {/* 蛇身 */}
        {snake.map((segment, index) => (
          <div
            key={index}
            className={`absolute w-5 h-5 rounded-sm transition-all duration-100
              ${index === 0 
                ? 'bg-gradient-to-r from-green-400 to-green-600 shadow-lg' 
                : 'bg-gradient-to-r from-green-500 to-green-700'}`
            }
            style={{
              left: `${segment.x * 20}px`,
              top: `${segment.y * 20}px`,
              transform: index === 0 ? `rotate(${getHeadRotation()}deg)` : 'none',
            }}
          />
        ))}
      </div>

      {/* 控制说明 */}
      <div className="mt-8 flex gap-6">
        <div className="flex flex-col items-center bg-gray-800/50 px-4 py-3 rounded-lg">
          <span className="text-gray-400 text-sm mb-2">方向控制</span>
          <div className="grid grid-cols-3 gap-1">
            <div />
            <div className="bg-gray-700 w-8 h-8 flex items-center justify-center rounded">↑</div>
            <div />
            <div className="bg-gray-700 w-8 h-8 flex items-center justify-center rounded">←</div>
            <div className="bg-gray-700 w-8 h-8 flex items-center justify-center rounded">↓</div>
            <div className="bg-gray-700 w-8 h-8 flex items-center justify-center rounded">→</div>
          </div>
        </div>
        <div className="flex flex-col items-center bg-gray-800/50 px-4 py-3 rounded-lg">
          <span className="text-gray-400 text-sm mb-2">游戏控制</span>
          <div className="flex gap-2">
            <div className="bg-gray-700 px-3 py-1 rounded text-sm">Space</div>
            <span className="text-gray-400">暂停/继续</span>
          </div>
        </div>
      </div>

      {/* 排行榜 */}
      <div className="fixed top-4 right-4 bg-gray-800/90 p-4 rounded-lg shadow-xl backdrop-blur-sm w-64">
        <h2 className="text-xl font-bold mb-4 text-center text-green-400">排行榜</h2>
        {highScores.length > 0 ? (
          <div className="space-y-2">
            {highScores.map((record, index) => (
              <div 
                key={index}
                className="flex justify-between items-center text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className={`
                    ${index === 0 ? 'text-yellow-400' : 
                      index === 1 ? 'text-gray-300' :
                      index === 2 ? 'text-amber-600' : 'text-gray-400'}
                    font-bold
                  `}>
                    #{index + 1}
                  </span>
                  <span className="text-white">{record.score}</span>
                </div>
                <span className="text-gray-400 text-xs">{record.date.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400">暂无记录</p>
        )}
      </div>

      {/* 游戏结束弹窗 */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl text-center">
            <h2 className="text-3xl font-bold mb-4 text-red-500">游戏结束！</h2>
            <p className="mb-6">
              <span className="text-gray-400">最终得分: </span>
              <span className="text-2xl font-bold text-green-400">{score}</span>
            </p>
            
            {showNameInput && score > 0 ? (
              <div className="mb-6">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="输入你的名字"
                  className="px-4 py-2 bg-gray-700 rounded-lg text-white mb-4 w-full"
                  maxLength={10}
                />
                <button
                  className="px-6 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                  onClick={() => saveScore()}
                  disabled={!playerName.trim()}
                >
                  保存分数
                </button>
              </div>
            ) : (
              <button
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg
                          hover:from-green-600 hover:to-green-700 transform hover:scale-105
                          transition-all duration-200 shadow-lg"
                onClick={startNewGame}
              >
                重新开始
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 