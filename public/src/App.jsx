import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, Timer, Target, Zap } from 'lucide-react';

export default function App() {
  const [workoutState, setWorkoutState] = useState('setup'); // setup, running, paused, complete
  const [currentExercise, setCurrentExercise] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [reps, setReps] = useState(0);
  const [time, setTime] = useState(0);
  const [workoutPlan, setWorkoutPlan] = useState([]);
  const [totalTime, setTotalTime] = useState(0);

  // MURPH workout structure
  const exercises = [
    { name: '1 Mile Run', type: 'cardio', reps: 1, unit: 'mile' },
    { name: 'Pull-ups', type: 'strength', reps: 100, unit: 'reps' },
    { name: 'Push-ups', type: 'strength', reps: 200, unit: 'reps' },
    { name: 'Air Squats', type: 'strength', reps: 300, unit: 'reps' },
    { name: '1 Mile Run', type: 'cardio', reps: 1, unit: 'mile' }
  ];

  // Preset workout plans
  const workoutPlans = {
    '20-10-20': { pullups: 5, pushups: 10, squats: 15, sets: 20 },
    '10-15-25': { pullups: 10, pushups: 15, squats: 25, sets: 10 },
    '5-10-15': { pullups: 5, pushups: 10, squats: 15, sets: 20 },
    'straight': { pullups: 100, pushups: 200, squats: 300, sets: 1 }
  };

  // Timer effect
  useEffect(() => {
    let interval;
    if (workoutState === 'running') {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [workoutState]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startWorkout = (planKey) => {
    const plan = workoutPlans[planKey];
    setWorkoutPlan(plan);
    setWorkoutState('running');
    setCurrentExercise(0);
    setCurrentSet(1);
    setReps(0);
    setTime(0);
  };

  const toggleTimer = () => {
    setWorkoutState(workoutState === 'running' ? 'paused' : 'running');
  };

  const resetWorkout = () => {
    setWorkoutState('setup');
    setCurrentExercise(0);
    setCurrentSet(1);
    setReps(0);
    setTime(0);
    setTotalTime(0);
  };

  const completeExercise = () => {
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise(prev => prev + 1);
      setCurrentSet(1);
      setReps(0);
    } else {
      setWorkoutState('complete');
      setTotalTime(time);
    }
  };

  const addRep = () => {
    const exercise = exercises[currentExercise];
    if (exercise.type === 'strength') {
      const plan = workoutPlan;
      let targetReps;
      
      if (exercise.name === 'Pull-ups') targetReps = plan.pullups;
      else if (exercise.name === 'Push-ups') targetReps = plan.pushups;
      else if (exercise.name === 'Air Squats') targetReps = plan.squats;
      
      if (reps + 1 >= targetReps) {
        if (currentSet < plan.sets) {
          setCurrentSet(prev => prev + 1);
          setReps(0);
        } else {
          completeExercise();
        }
      } else {
        setReps(prev => prev + 1);
      }
    }
  };

  const getCurrentTargetReps = () => {
    const exercise = exercises[currentExercise];
    if (exercise.type === 'cardio') return 1;
    
    if (exercise.name === 'Pull-ups') return workoutPlan.pullups;
    if (exercise.name === 'Push-ups') return workoutPlan.pushups;
    if (exercise.name === 'Air Squats') return workoutPlan.squats;
    return 0;
  };

  const getTotalProgress = () => {
    if (workoutState === 'setup') return 0;
    return ((currentExercise + (currentSet - 1) / workoutPlan.sets) / exercises.length) * 100;
  };

  if (workoutState === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">MURPH</h1>
            <p className="text-gray-300">Choose your workout plan</p>
          </div>
          
          <div className="space-y-4">
            {Object.entries(workoutPlans).map(([key, plan]) => (
              <button
                key={key}
                onClick={() => startWorkout(key)}
                className="w-full bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-left transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold capitalize">
                      {key === 'straight' ? 'Straight Through' : `${plan.pullups}-${plan.pushups}-${plan.squats}`}
                    </h3>
                    <p className="text-sm text-gray-300">
                      {plan.sets} sets of {plan.pullups} pull-ups, {plan.pushups} push-ups, {plan.squats} squats
                    </p>
                  </div>
                  <Play className="w-6 h-6 text-blue-400" />
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-8 p-4 bg-gray-800 rounded-lg">
            <h3 className="font-semibold mb-2">The MURPH Workout</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• 1 Mile Run</li>
              <li>• 100 Pull-ups</li>
              <li>• 200 Push-ups</li>
              <li>• 300 Air Squats</li>
              <li>• 1 Mile Run</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (workoutState === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-gray-800 to-gray-900 text-white p-4">
        <div className="max-w-md mx-auto pt-16 text-center">
          <CheckCircle className="w-24 h-24 text-green-400 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">MURPH COMPLETE!</h1>
          <div className="text-2xl mb-8">
            Total Time: {formatTime(totalTime)}
          </div>
          <button
            onClick={resetWorkout}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            New Workout
          </button>
        </div>
      </div>
    );
  }

  const currentExerciseData = exercises[currentExercise];
  const targetReps = getCurrentTargetReps();
  const progress = getTotalProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Timer className="w-6 h-6 text-blue-400" />
            <span className="text-2xl font-mono">{formatTime(time)}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Exercise */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">{currentExerciseData.name}</h2>
            
            {currentExerciseData.type === 'cardio' ? (
              <div className="space-y-4">
                <Target className="w-16 h-16 text-blue-400 mx-auto" />
                <button
                  onClick={completeExercise}
                  className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Complete Run
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-lg">
                  Set {currentSet} of {workoutPlan.sets}
                </div>
                <div className="text-4xl font-bold">
                  {reps} / {targetReps}
                </div>
                <button
                  onClick={addRep}
                  disabled={workoutState === 'paused'}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 w-24 h-24 rounded-full font-semibold text-xl transition-colors flex items-center justify-center mx-auto"
                >
                  +1
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={toggleTimer}
            className="bg-yellow-600 hover:bg-yellow-700 p-3 rounded-lg transition-colors"
          >
            {workoutState === 'running' ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>
          <button
            onClick={resetWorkout}
            className="bg-red-600 hover:bg-red-700 p-3 rounded-lg transition-colors"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>

        {/* Exercise List */}
        <div className="mt-8 space-y-2">
          {exercises.map((exercise, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg flex justify-between items-center ${
                index === currentExercise 
                  ? 'bg-blue-600' 
                  : index < currentExercise 
                    ? 'bg-green-700' 
                    : 'bg-gray-700'
              }`}
            >
              <span className="font-medium">{exercise.name}</span>
              <span className="text-sm">
                {exercise.reps} {exercise.unit}
              </span>
              {index < currentExercise && <CheckCircle className="w-5 h-5 text-green-300" />}
              {index === currentExercise && <Zap className="w-5 h-5 text-yellow-300" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
