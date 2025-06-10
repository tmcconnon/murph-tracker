import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, ChevronLeft, ChevronRight, History, Trash2, Trophy, Star } from 'lucide-react';

const MurphTracker = () => {
  const [screen, setScreen] = useState('setup'); // 'setup', 'ready', 'workout', 'complete', 'history'
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({ workoutId: null, step: 'initial' }); // 'initial', 'confirm'
  const [currentStep, setCurrentStep] = useState(1); // 1, 2, 3
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const audioContextRef = useRef(null);
  const [workoutState, setWorkoutState] = useState({
    phase: 'run1', // 'run1', 'bodyweight', 'run2'
    isRunning: false,
    totalTime: 0,
    currentRound: 1,
    currentMovement: 'pullups', // 'pullups', 'pushups', 'squats'
    currentReps: 0
  });
  
  const [customPartition, setCustomPartition] = useState({
    rounds: 20,
    pullups: 5,
    pushups: 10,
    squats: 15,
    useVest: null, // null, true, false
    vestWeight: 20,
    includeRun: null, // null, true, false
    runDistance: 1.0,
    selectedBodyweight: null // null, 'official', 'big', 'small', 'custom'
  });

  const [completedReps, setCompletedReps] = useState({
    pullups: 0,
    pushups: 0,
    squats: 0
  });

  // Timer effect
  useEffect(() => {
    let interval;
    if (workoutState.isRunning) {
      interval = setInterval(() => {
        setWorkoutState(prev => ({
          ...prev,
          totalTime: prev.totalTime + 1
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [workoutState.isRunning]);

  // Sound functions
  const createBeepSound = (frequency = 800, duration = 200) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration / 1000);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration / 1000);
    } catch (error) {
      console.log('Audio not available');
    }
  };

  const playCompletionSound = () => {
    // Play a pleasant completion chime
    setTimeout(() => createBeepSound(523, 150), 0);   // C5
    setTimeout(() => createBeepSound(659, 150), 150); // E5
    setTimeout(() => createBeepSound(784, 300), 300); // G5
  };

  const playCelebrationSound = () => {
    // Play a victory fanfare
    setTimeout(() => createBeepSound(523, 200), 0);   // C5
    setTimeout(() => createBeepSound(659, 200), 200); // E5
    setTimeout(() => createBeepSound(784, 200), 400); // G5
    setTimeout(() => createBeepSound(1047, 400), 600); // C6
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const saveWorkout = () => {
    const workout = {
      id: Date.now(),
      date: new Date().toISOString(),
      totalTime: workoutState.totalTime,
      configuration: {
        includeRun: customPartition.includeRun,
        runDistance: customPartition.runDistance,
        rounds: customPartition.rounds,
        pullups: customPartition.pullups,
        pushups: customPartition.pushups,
        squats: customPartition.squats,
        useVest: customPartition.useVest,
        vestWeight: customPartition.vestWeight,
        selectedBodyweight: customPartition.selectedBodyweight
      },
      completedReps: { ...completedReps }
    };
    
    setWorkoutHistory(prev => [workout, ...prev]);
  };

  const deleteWorkout = (workoutId) => {
    setWorkoutHistory(prev => prev.filter(w => w.id !== workoutId));
    setShowDeleteConfirm({ workoutId: null, step: 'initial' });
  };

  const startWorkout = () => {
    setScreen('ready');
  };

  const startTimer = () => {
    setScreen('workout');
    setWorkoutState(prev => ({ 
      ...prev, 
      isRunning: true,
      phase: customPartition.includeRun ? 'run1' : 'bodyweight'
    }));
  };

  const toggleTimer = () => {
    setWorkoutState(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const resetWorkout = () => {
    setWorkoutState({
      phase: customPartition.includeRun ? 'run1' : 'bodyweight',
      isRunning: false,
      totalTime: 0,
      currentRound: 1,
      currentMovement: 'pullups',
      currentReps: 0
    });
    setCompletedReps({ pullups: 0, pushups: 0, squats: 0 });
    setCelebrationActive(false);
    setScreen('setup');
    setCurrentStep(1);
    setShowResetConfirm(false);
  };

  const completeReps = () => {
    const movement = workoutState.currentMovement;
    const repsToAdd = customPartition[movement];
    
    // Play completion sound
    playCompletionSound();
    
    setCompletedReps(prev => ({
      ...prev,
      [movement]: prev[movement] + repsToAdd
    }));

    // Move to next movement or round
    if (movement === 'pullups') {
      setWorkoutState(prev => ({ ...prev, currentMovement: 'pushups' }));
    } else if (movement === 'pushups') {
      setWorkoutState(prev => ({ ...prev, currentMovement: 'squats' }));
    } else if (movement === 'squats') {
      if (workoutState.currentRound < customPartition.rounds) {
        setWorkoutState(prev => ({
          ...prev,
          currentRound: prev.currentRound + 1,
          currentMovement: 'pullups'
        }));
      } else {
        // Bodyweight complete - either move to final run or finish workout
        if (customPartition.includeRun) {
          setWorkoutState(prev => ({ ...prev, phase: 'run2' }));
        } else {
          setWorkoutState(prev => ({ ...prev, isRunning: false }));
          saveWorkout();
          setCelebrationActive(true);
          playCelebrationSound();
          setScreen('complete');
        }
      }
    }
  };

  const completeRun = () => {
    playCompletionSound();
    
    if (workoutState.phase === 'run1') {
      setWorkoutState(prev => ({ ...prev, phase: 'bodyweight' }));
    } else if (workoutState.phase === 'run2') {
      setWorkoutState(prev => ({ ...prev, isRunning: false }));
      saveWorkout();
      setCelebrationActive(true);
      playCelebrationSound();
      setScreen('complete');
    }
  };

  const presetPartitions = [
    { 
      id: 'official',
      name: "Cindy Style", 
      rounds: 20, 
      pullups: 5, 
      pushups: 10, 
      squats: 15,
      description: "Breaks things up to keep you fresh. Arguably the most popular and manageable pacing."
    },
    { 
      id: 'big',
      name: "Big Sets", 
      rounds: 10, 
      pullups: 10, 
      pushups: 20, 
      squats: 30,
      description: "Fewer rounds, bigger sets. For strong athletes who want to get it done faster."
    },
    { 
      id: 'small',
      name: "Small & Steady", 
      rounds: 25, 
      pullups: 4, 
      pushups: 8, 
      squats: 12,
      description: "More rounds, smaller sets. Great for beginners or when you want to pace evenly."
    },
  ];

  const canProceedFromStep = (step) => {
    switch(step) {
      case 1: return customPartition.includeRun !== null;
      case 2: return customPartition.selectedBodyweight !== null;
      case 3: return customPartition.useVest !== null;
      default: return false;
    }
  };

  // Setup Screen // force update
  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-blue-400 mb-2">MURPH Tracker</h1>
            <p className="text-lg text-gray-300 mb-1">Build & track your MURPH workouts</p>
            <p className="text-sm text-gray-400">Configure every detail to match your<br />fitness level & goals in 3 simple steps</p>
          </div>

          {/* STEP 1: RUNNING */}
          {currentStep === 1 && (
            <>
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-bold mb-2 text-center">Step 1: Choose Your Running Option</h2>
                <div className="text-sm text-gray-400 mb-6 text-center">
                  Official MURPH uses 1.0 mile runs (beginning and end)
                </div>
                
                <div className="space-y-4 mb-6">
                  <button
                    onClick={() => setCustomPartition(prev => ({ ...prev, includeRun: true }))}
                    className={`w-full rounded-lg p-4 text-center font-semibold transition-colors border-2 ${
                      customPartition.includeRun === true
                        ? 'bg-blue-800 border-blue-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    ✓ Begin and end with a run
                  </button>

                  {customPartition.includeRun === true && (
                    <div className="text-center">
                      <label className="block text-sm text-gray-300 mb-3">Distance (miles)</label>
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={() => setCustomPartition(prev => ({ ...prev, runDistance: Math.max(0.1, prev.runDistance - 0.1) }))}
                          className="bg-gray-600 hover:bg-gray-500 rounded-lg p-3 font-bold text-lg transition-colors min-w-[50px]"
                        >
                          −
                        </button>
                        <div className="bg-gray-700 rounded-lg p-3 text-center font-semibold text-lg min-w-[80px]">
                          {customPartition.runDistance.toFixed(1)}
                        </div>
                        <button 
                          onClick={() => setCustomPartition(prev => ({ ...prev, runDistance: prev.runDistance + 0.1 }))}
                          className="bg-gray-600 hover:bg-gray-500 rounded-lg p-3 font-bold text-lg transition-colors min-w-[50px]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setCustomPartition(prev => ({ ...prev, includeRun: false }))}
                    className={`w-full rounded-lg p-4 text-center font-semibold transition-colors border-2 ${
                      customPartition.includeRun === false
                        ? 'bg-blue-800 border-blue-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    ✗ No run today
                  </button>
                </div>
              </div>

              {canProceedFromStep(1) && (
                <button 
                  onClick={() => setCurrentStep(2)}
                  className="w-full bg-green-600 hover:bg-green-500 rounded-lg p-4 font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  Next: Choose Your Reps & Sets
                  <ChevronRight size={20} />
                </button>
              )}
            </>
          )}

          {/* STEP 2: BODYWEIGHT EXERCISES */}
          {currentStep === 2 && (
            <>
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-bold mb-2 text-center">Step 2: Choose Your Reps & Sets</h2>
                <div className="text-sm text-gray-400 mb-6 text-center">
                  Official MURPH includes 100 pull-ups, 200 push-ups, and 300 squats. But you can choose your way.
                </div>
                
                {/* Preset Options as Toggle Cards */}
                <div className="space-y-3 mb-6">
                  {presetPartitions.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setCustomPartition(prev => ({ 
                        ...prev, 
                        selectedBodyweight: preset.id,
                        rounds: preset.rounds,
                        pullups: preset.pullups,
                        pushups: preset.pushups,
                        squats: preset.squats
                      }))}
                      className={`w-full rounded-lg p-4 text-left transition-colors border-2 ${
                        customPartition.selectedBodyweight === preset.id
                          ? 'bg-blue-800 border-blue-500 text-white' 
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-lg">
                          {customPartition.selectedBodyweight === preset.id ? '✓ ' : ''}{preset.name}
                        </div>
                        <div className="text-sm text-gray-400">{preset.rounds} rounds</div>
                      </div>
                      <div className="text-sm mb-2">{preset.description}</div>
                      <div className="text-xs text-gray-400">
                        {preset.rounds}x {preset.pullups} pull-ups, {preset.pushups} push-ups, {preset.squats} squats = {preset.rounds * preset.pullups}/{preset.rounds * preset.pushups}/{preset.rounds * preset.squats} total
                      </div>
                    </button>
                  ))}

                  {/* Custom MURPH Toggle Card with INTEGRATED Controls */}
                  <div
                    className={`w-full rounded-lg p-4 transition-colors border-2 ${
                      customPartition.selectedBodyweight === 'custom'
                        ? 'bg-blue-800 border-blue-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300'
                    }`}
                  >
                    <button
                      onClick={() => setCustomPartition(prev => ({ ...prev, selectedBodyweight: 'custom' }))}
                      className="w-full text-left"
                    >
                      <div className="font-semibold text-lg mb-2">
                        {customPartition.selectedBodyweight === 'custom' ? '✓ ' : ''}Custom MURPH
                      </div>
                      <div className="text-sm mb-3">
                        Customize the number of reps and sets however you'd like.
                      </div>
                    </button>

                    {/* Custom Controls - INTEGRATED WITHIN THE CARD */}
                    {customPartition.selectedBodyweight === 'custom' && (
                      <div className="mt-4 pt-4 border-t border-blue-400 space-y-4">
                        {/* Rounds */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Rounds</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setCustomPartition(prev => ({ ...prev, rounds: Math.max(1, prev.rounds - 1) }))}
                              className="bg-blue-600 hover:bg-blue-500 rounded-lg p-2 font-bold transition-colors w-[36px] h-[36px] flex items-center justify-center"
                            >
                              −
                            </button>
                            <div className="bg-blue-900 rounded-lg text-center font-semibold w-[72px] h-[36px] flex items-center justify-center font-mono">
                              {customPartition.rounds}
                            </div>
                            <button 
                              onClick={() => setCustomPartition(prev => ({ ...prev, rounds: prev.rounds + 1 }))}
                              className="bg-blue-600 hover:bg-blue-500 rounded-lg p-2 font-bold transition-colors w-[36px] h-[36px] flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Pull-ups */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Pull-ups per round</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setCustomPartition(prev => ({ ...prev, pullups: Math.max(0, prev.pullups - 1) }))}
                              className="bg-blue-600 hover:bg-blue-500 rounded-lg p-2 font-bold transition-colors w-[36px] h-[36px] flex items-center justify-center"
                            >
                              −
                            </button>
                            <div className="bg-blue-900 rounded-lg text-center font-semibold w-[72px] h-[36px] flex items-center justify-center font-mono">
                              {customPartition.pullups}
                            </div>
                            <button 
                              onClick={() => setCustomPartition(prev => ({ ...prev, pullups: prev.pullups + 1 }))}
                              className="bg-blue-600 hover:bg-blue-500 rounded-lg p-2 font-bold transition-colors w-[36px] h-[36px] flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Push-ups */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Push-ups per round</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setCustomPartition(prev => ({ ...prev, pushups: Math.max(0, prev.pushups - 1) }))}
                              className="bg-blue-600 hover:bg-blue-500 rounded-lg p-2 font-bold transition-colors w-[36px] h-[36px] flex items-center justify-center"
                            >
                              −
                            </button>
                            <div className="bg-blue-900 rounded-lg text-center font-semibold w-[72px] h-[36px] flex items-center justify-center font-mono">
                              {customPartition.pushups}
                            </div>
                            <button 
                              onClick={() => setCustomPartition(prev => ({ ...prev, pushups: prev.pushups + 1 }))}
                              className="bg-blue-600 hover:bg-blue-500 rounded-lg p-2 font-bold transition-colors w-[36px] h-[36px] flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Squats */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Squats per round</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setCustomPartition(prev => ({ ...prev, squats: Math.max(0, prev.squats - 1) }))}
                              className="bg-blue-600 hover:bg-blue-500 rounded-lg p-2 font-bold transition-colors w-[36px] h-[36px] flex items-center justify-center"
                            >
                              −
                            </button>
                            <div className="bg-blue-900 rounded-lg text-center font-semibold w-[72px] h-[36px] flex items-center justify-center font-mono">
                              {customPartition.squats}
                            </div>
                            <button 
                              onClick={() => setCustomPartition(prev => ({ ...prev, squats: prev.squats + 1 }))}
                              className="bg-blue-600 hover:bg-blue-500 rounded-lg p-2 font-bold transition-colors w-[36px] h-[36px] flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Total Summary */}
                        <div className="text-xs text-blue-200 pt-2 border-t border-blue-400">
                          Total: {customPartition.rounds * customPartition.pullups} pull-ups, {customPartition.rounds * customPartition.pushups} push-ups, {customPartition.rounds * customPartition.squats} squats
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setCurrentStep(1)}
                  className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 font-semibold transition-colors flex items-center gap-2"
                >
                  <ChevronLeft size={20} />
                  Back
                </button>
                {canProceedFromStep(2) && (
                  <button 
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 bg-green-600 hover:bg-green-500 rounded-lg p-4 font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Next: Choose Your Vest Option
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>
            </>
          )}

          {/* STEP 3: WEIGHT VEST */}
          {currentStep === 3 && (
            <>
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-bold mb-2 text-center">Step 3: Choose Your Vest Option</h2>
                <div className="text-sm text-gray-400 mb-6 text-center">
                  Official MURPH uses 20 lbs (men) / 14 lbs (women)
                </div>
                
                <div className="space-y-4 mb-6">
                  <button
                    onClick={() => setCustomPartition(prev => ({ ...prev, useVest: true }))}
                    className={`w-full rounded-lg p-4 text-center font-semibold transition-colors border-2 ${
                      customPartition.useVest === true
                        ? 'bg-blue-800 border-blue-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    ✓ Wear Weight Vest
                  </button>

                  {customPartition.useVest === true && (
                    <div className="text-center">
                      <label className="block text-sm text-gray-300 mb-3">Weight (lbs)</label>
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={() => setCustomPartition(prev => ({ ...prev, vestWeight: Math.max(0, prev.vestWeight - 1) }))}
                          className="bg-gray-600 hover:bg-gray-500 rounded-lg p-3 font-bold text-lg transition-colors min-w-[50px]"
                        >
                          −
                        </button>
                        <div className="bg-gray-700 rounded-lg p-3 text-center font-semibold text-lg min-w-[80px]">
                          {customPartition.vestWeight} lbs
                        </div>
                        <button 
                          onClick={() => setCustomPartition(prev => ({ ...prev, vestWeight: prev.vestWeight + 1 }))}
                          className="bg-gray-600 hover:bg-gray-500 rounded-lg p-3 font-bold text-lg transition-colors min-w-[50px]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setCustomPartition(prev => ({ ...prev, useVest: false }))}
                    className={`w-full rounded-lg p-4 text-center font-semibold transition-colors border-2 ${
                      customPartition.useVest === false
                        ? 'bg-blue-800 border-blue-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    ✗ No weighted vest today
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setCurrentStep(2)}
                  className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 font-semibold transition-colors flex items-center gap-2"
                >
                  <ChevronLeft size={20} />
                  Back
                </button>
                {canProceedFromStep(3) && (
                  <button 
                    onClick={startWorkout}
                    className="flex-1 bg-green-600 hover:bg-green-500 rounded-lg p-4 font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Play size={24} />
                    Start Murph
                  </button>
                )}
              </div>
              
              {/* History Button */}
              <button 
                onClick={() => setScreen('history')}
                className="w-full mt-4 bg-gray-700 hover:bg-gray-600 rounded-lg p-4 font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <History size={20} />
                View Workout History ({workoutHistory.length})
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // History Screen
  if (screen === 'history') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-blue-400 mb-2">Workout History</h1>
            <p className="text-gray-300">{workoutHistory.length} completed MURPHs</p>
          </div>

          {workoutHistory.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <Trophy size={48} className="mx-auto text-gray-500 mb-4" />
              <p className="text-gray-400 mb-4">No workouts completed yet</p>
              <p className="text-sm text-gray-500">Complete your first MURPH to see it here!</p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {workoutHistory.map((workout) => {
                const selectedPreset = presetPartitions.find(p => p.id === workout.configuration.selectedBodyweight);
                const workoutDate = new Date(workout.date);
                
                return (
                  <div key={workout.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-lg font-bold text-blue-400">{formatTime(workout.totalTime)}</div>
                        <div className="text-sm text-gray-400">
                          {workoutDate.toLocaleDateString()} at {workoutDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm({ workoutId: workout.id, step: 'initial' })}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Delete workout"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-300 mb-2">
                      {workout.configuration.selectedBodyweight === 'custom' ? 
                        `Custom: ${workout.configuration.rounds} rounds` :
                        selectedPreset?.name || 'Cindy Style'}
                      {workout.configuration.useVest && ` • ${workout.configuration.vestWeight}lb vest`}
                      {workout.configuration.includeRun && ` • ${workout.configuration.runDistance.toFixed(1)}mi runs`}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center text-xs">
                      <div>
                        <div className="font-semibold">{workout.completedReps.pullups}</div>
                        <div className="text-gray-400">Pull-ups</div>
                      </div>
                      <div>
                        <div className="font-semibold">{workout.completedReps.pushups}</div>
                        <div className="text-gray-400">Push-ups</div>
                      </div>
                      <div>
                        <div className="font-semibold">{workout.completedReps.squats}</div>
                        <div className="text-gray-400">Squats</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button 
            onClick={() => setScreen('setup')}
            className="w-full bg-blue-600 hover:bg-blue-500 rounded-lg p-4 font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} />
            Back to Setup
          </button>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm.workoutId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
                <h3 className="text-lg font-bold mb-3">Delete Workout?</h3>
                <p className="text-gray-300 mb-6">
                  This will permanently delete this workout from your history. This action cannot be undone.
                </p>
                <div className="flex gap-3 mb-3">
                  <button 
                    onClick={() => setShowDeleteConfirm({ workoutId: null, step: 'initial' })}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg p-3 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(prev => ({ ...prev, step: 'confirm' }))}
                    className="flex-1 bg-red-600 hover:bg-red-500 rounded-lg p-3 font-semibold transition-colors"
                  >
                    Delete
                  </button>
                </div>
                {showDeleteConfirm.step === 'confirm' && (
                  <div className="pt-3 border-t border-gray-600">
                    <p className="text-sm text-gray-400 mb-3">Are you absolutely sure? Click "Confirm Delete" to proceed.</p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowDeleteConfirm({ workoutId: null, step: 'initial' })}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg p-2 text-sm font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => deleteWorkout(showDeleteConfirm.workoutId)}
                        className="flex-1 bg-red-600 hover:bg-red-500 rounded-lg p-2 text-sm font-semibold transition-colors"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Ready Screen
  if (screen === 'ready') {
    const selectedPreset = presetPartitions.find(p => p.id === customPartition.selectedBodyweight);
    
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-blue-400 mb-2">Get Ready!</h1>
            <p className="text-gray-300">Review your workout and prepare to start</p>
          </div>

          {/* Workout Summary */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-center">Your MURPH Workout</h2>
            
            {/* Running */}
            <div className="mb-4 pb-4 border-b border-gray-600">
              <h3 className="font-semibold text-blue-400 mb-2">Running</h3>
              {customPartition.includeRun ? (
                <p className="text-gray-300">
                  {customPartition.runDistance.toFixed(1)} mile runs (beginning and end)
                </p>
              ) : (
                <p className="text-gray-300">No running today</p>
              )}
            </div>

            {/* Bodyweight */}
            <div className="mb-4 pb-4 border-b border-gray-600">
              <h3 className="font-semibold text-blue-400 mb-2">Bodyweight Exercises</h3>
              {customPartition.selectedBodyweight === 'custom' ? (
                <div>
                  <p className="text-gray-300 mb-1">Custom: {customPartition.rounds} rounds</p>
                  <p className="text-sm text-gray-400">
                    {customPartition.pullups} pull-ups, {customPartition.pushups} push-ups, {customPartition.squats} squats per round
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Total: {customPartition.rounds * customPartition.pullups} pull-ups, {customPartition.rounds * customPartition.pushups} push-ups, {customPartition.rounds * customPartition.squats} squats
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-300 mb-1">{selectedPreset?.name}: {customPartition.rounds} rounds</p>
                  <p className="text-sm text-gray-400">
                    {customPartition.pullups} pull-ups, {customPartition.pushups} push-ups, {customPartition.squats} squats per round
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Total: {customPartition.rounds * customPartition.pullups} pull-ups, {customPartition.rounds * customPartition.pushups} push-ups, {customPartition.rounds * customPartition.squats} squats
                  </p>
                </div>
              )}
            </div>

            {/* Weight Vest */}
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">Weight Vest</h3>
              {customPartition.useVest ? (
                <p className="text-gray-300">{customPartition.vestWeight} lb vest</p>
              ) : (
                <p className="text-gray-300">No vest today</p>
              )}
            </div>
          </div>

          {/* Prep Reminders */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-300 mb-3">Before you start:</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              {customPartition.useVest && <li>• Put on your weight vest</li>}
              {customPartition.includeRun && <li>• Start your running/fitness app</li>}
              <li>• Set up your workout space</li>
              <li>• Get water nearby</li>
              <li>• Take a deep breath 💪</li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button 
              onClick={() => setScreen('setup')}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 font-semibold transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              Back to Setup
            </button>
            <button 
              onClick={startTimer}
              className="flex-1 bg-green-600 hover:bg-green-500 rounded-lg p-4 font-semibold text-lg transition-colors flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Start Timer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Workout Screen
  if (screen === 'workout') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-blue-400 mb-1">{formatTime(workoutState.totalTime)}</div>
            <div className="text-gray-300 capitalize">
              {workoutState.phase === 'run1' ? `Opening ${customPartition.runDistance.toFixed(1)} Mile Run` : 
               workoutState.phase === 'run2' ? `Final ${customPartition.runDistance.toFixed(1)} Mile Run` : 
               'Bodyweight Movements'}
            </div>
          </div>

          {/* Current Phase */}
          {workoutState.phase === 'run1' || workoutState.phase === 'run2' ? (
            <div className="bg-gray-800 rounded-lg p-6 mb-6 text-center">
              <h2 className="text-2xl font-bold mb-4">{customPartition.runDistance.toFixed(1)} Mile Run</h2>
              <p className="text-gray-300 mb-6">Complete your {workoutState.phase === 'run1' ? 'opening' : 'closing'} {customPartition.runDistance.toFixed(1)} mile run</p>
              <button 
                onClick={completeRun}
                className="bg-green-600 hover:bg-green-500 rounded-lg px-6 py-3 font-semibold transition-colors"
              >
                <CheckCircle className="inline mr-2" size={20} />
                Complete Run
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Round */}
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-lg font-semibold">Round {workoutState.currentRound} of {customPartition.rounds}</div>
                <div className="text-sm text-gray-400">
                  {customPartition.pullups} pull-ups, {customPartition.pushups} push-ups, {customPartition.squats} squats
                </div>
              </div>

              {/* Current Movement */}
              <div className="bg-blue-800 rounded-lg p-6 text-center">
                <h2 className="text-2xl font-bold mb-2 capitalize">{workoutState.currentMovement}</h2>
                <div className="text-3xl font-bold mb-4">{customPartition[workoutState.currentMovement]} reps</div>
                <button 
                  onClick={completeReps}
                  className="bg-blue-600 hover:bg-blue-500 rounded-lg px-8 py-3 font-semibold transition-colors"
                >
                  <CheckCircle className="inline mr-2" size={20} />
                  Complete Set
                </button>
              </div>

              {/* Progress Summary */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Total Progress</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold">{completedReps.pullups}</div>
                    <div className="text-xs text-gray-400">/ {customPartition.rounds * customPartition.pullups} Pull-ups</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{completedReps.pushups}</div>
                    <div className="text-xs text-gray-400">/ {customPartition.rounds * customPartition.pushups} Push-ups</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{completedReps.squats}</div>
                    <div className="text-xs text-gray-400">/ {customPartition.rounds * customPartition.squats} Squats</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3 mt-6">
            <button 
              onClick={toggleTimer}
              className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg p-3 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {workoutState.isRunning ? <Pause size={20} /> : <Play size={20} />}
              {workoutState.isRunning ? 'Pause' : 'Resume'}
            </button>
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="bg-red-600 hover:bg-red-500 rounded-lg p-3 transition-colors"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          {/* Reset Confirmation Modal */}
          {showResetConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
                <h3 className="text-lg font-bold mb-3">Restart Workout?</h3>
                <p className="text-gray-300 mb-6">This will reset your timer and lose all progress. Are you sure?</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg p-3 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={resetWorkout}
                    className="flex-1 bg-red-600 hover:bg-red-500 rounded-lg p-3 font-semibold transition-colors"
                  >
                    Restart
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Completion Screen
  if (screen === 'complete') {
    return (
      <div className={`min-h-screen bg-gray-900 text-white p-4 relative overflow-hidden ${celebrationActive ? 'animate-pulse' : ''}`}>
        {/* Celebration Effects */}
        {celebrationActive && (
          <>
            {/* Floating Stars */}
            {[...Array(12)].map((_, i) => (
              <Star 
                key={i}
                size={Math.random() * 20 + 10}
                className={`absolute text-yellow-400 animate-bounce`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${Math.random() * 1 + 1.5}s`
                }}
              />
            ))}
            
            {/* Gradient overlay for celebration */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-green-900/20 animate-pulse"></div>
          </>
        )}
        
        <div className="max-w-md mx-auto text-center relative z-10">
          <div className="mb-8">
            <div className={`inline-block ${celebrationActive ? 'animate-bounce' : ''}`}>
              <CheckCircle size={80} className="mx-auto text-green-500 mb-4" />
            </div>
            <h1 className={`text-3xl font-bold mb-2 ${celebrationActive ? 'text-yellow-300' : ''}`}>
              🎉 MURPH COMPLETE! 🎉
            </h1>
            <p className="text-gray-300">In honor of Lt. Michael Murphy</p>
            {celebrationActive && (
              <div className="mt-4">
                <div className="text-lg font-semibold text-yellow-300 animate-pulse">
                  🏆 OUTSTANDING WORK! 🏆
                </div>
                <div className="text-sm text-gray-300 mt-2">
                  You've joined the ranks of warriors who honor Lt. Murphy's sacrifice
                </div>
              </div>
            )}
          </div>

          <div className={`bg-gray-800 rounded-lg p-6 mb-6 ${celebrationActive ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/25' : ''}`}>
            <div className={`text-4xl font-bold mb-2 ${celebrationActive ? 'text-yellow-300' : 'text-blue-400'}`}>
              {formatTime(workoutState.totalTime)}
            </div>
            <div className="text-gray-300 mb-4">Total Time</div>
            
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div className="text-lg font-bold">{completedReps.pullups}</div>
                <div className="text-xs text-gray-400">Pull-ups</div>
              </div>
              <div>
                <div className="text-lg font-bold">{completedReps.pushups}</div>
                <div className="text-xs text-gray-400">Push-ups</div>
              </div>
              <div>
                <div className="text-lg font-bold">{completedReps.squats}</div>
                <div className="text-xs text-gray-400">Squats</div>
              </div>
            </div>

            <div className="text-sm text-gray-400">
              {customPartition.selectedBodyweight === 'custom' ? 
                `Custom: ${customPartition.rounds} rounds of ${customPartition.pullups}-${customPartition.pushups}-${customPartition.squats}` :
                `${presetPartitions.find(p => p.id === customPartition.selectedBodyweight)?.name || 'Cindy Style'}`}
              {customPartition.useVest && ` • ${customPartition.vestWeight}lb vest`}
              {customPartition.includeRun && ` • ${customPartition.runDistance.toFixed(1)} mile runs`}
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <button 
              onClick={resetWorkout}
              className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-lg p-4 font-semibold text-lg transition-colors"
            >
              New Workout
            </button>
            <button 
              onClick={() => setScreen('history')}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 font-semibold transition-colors flex items-center gap-2"
            >
              <History size={20} />
              History
            </button>
          </div>
          
          {celebrationActive && (
            <button 
              onClick={() => setCelebrationActive(false)}
              className="w-full bg-gray-600 hover:bg-gray-500 rounded-lg p-2 text-sm font-semibold transition-colors"
            >
              Turn off celebration effects
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default MurphTracker;
