import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { usePosStore } from '../store/posStore';
import { X, CornerDownLeft, ArrowUp, ChevronsUp, Trash2 } from 'lucide-react';

const OnScreenKeyboard = () => {
  const { isKeyboardOpen, closeKeyboard, updateKeyboardTargetValue, activeInput, keyboardInput, setKeyboardInput } = usePosStore();
  const [layout, setLayout] = useState('default');
  const [capsLock, setCapsLock] = useState(false);
  const [shift, setShift] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const nodeRef = useRef(null);

  useEffect(() => {
    if (!isKeyboardOpen) {
      setCapsLock(false);
      setShift(false);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (nodeRef.current && !(nodeRef.current as any).contains(event.target)) {
        closeKeyboard();
      }
    };

    if (isKeyboardOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isKeyboardOpen, closeKeyboard]);

  useEffect(() => {
    if (activeInput) {
      const handleInput = (e: Event) => {
        setKeyboardInput((e.target as HTMLInputElement).value);
      };
      activeInput.addEventListener('input', handleInput);
      setKeyboardInput(activeInput.value); // Set initial value
      return () => {
        activeInput.removeEventListener('input', handleInput);
      };
    }
  }, [activeInput, setKeyboardInput]);

  if (!isKeyboardOpen) {
    return null;
  }

  const handleKeyPress = (key: string, e?: React.MouseEvent) => {
    // Prevent focus loss when clicking keyboard buttons
    if (e) {
      e.preventDefault();
    }

    if (!activeInput) return;

    // Ensure focus is kept on input
    activeInput.focus();

    let keyToPress = key;

    if (key.length === 1) {
      const isLetter = key.toLowerCase() !== key.toUpperCase();
      if (isLetter) {
        if (shift || capsLock) {
          keyToPress = key.toUpperCase();
        } else {
          keyToPress = key.toLowerCase();
        }
      } else if (shift) {
        const shiftMap: { [key: string]: string } = {
          '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
          '-': '_', '=': '+', '`': '~', '[': '{', ']': '}', '\\': '|', ';': ':', "'": '"', ',': '<', '.': '>', '/': '?'
        };
        keyToPress = shiftMap[key] || key;
      }
    }

    updateKeyboardTargetValue(keyToPress);

    if (shift) {
      setShift(false);
    }
  };

  const keys = {
    default: [
      '` 1 2 3 4 5 6 7 8 9 0 - =',
      'q w e r t y u i o p [ ] \\',
      'a s d f g h j k l ; \'',
      'z x c v b n m , . /',
    ],
    shift: [
      '~ ! @ # $ % ^ & * ( ) _ +',
      'Q W E R T Y U I O P { } |',
      'A S D F G H J K L : "',
      'Z X C V B N M < > ?',
    ]
  };

  const currentKeys = (shift || capsLock) && !((shift && capsLock)) ? keys.shift : keys.default;

  return (
    <Draggable nodeRef={nodeRef} handle=".keyboard-handle" key={isKeyboardOpen ? 'open' : 'closed'}>
      <div
        ref={nodeRef}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-gray-200 dark:bg-gray-800 p-2 rounded-lg shadow-2xl z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="keyboard-handle bg-gray-300 dark:bg-gray-700 h-6 rounded-t-md flex items-center justify-center cursor-move">
          <div className="w-12 h-1 bg-gray-400 dark:bg-gray-500 rounded-full" />
        </div>
        <div className="bg-white dark:bg-gray-700 p-2 rounded-md shadow-inner mb-2">
          <p className="text-lg text-gray-800 dark:text-white truncate">
            {keyboardInput}
          </p>
        </div>
        <div className="p-2">
          {currentKeys.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center space-x-1 mb-1">
              {row.split(' ').map((key) => (
                <button
                  key={key}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleKeyPress(key, e)}
                  className="h-12 flex-1 rounded bg-white dark:bg-gray-600 text-gray-800 dark:text-white font-semibold text-lg shadow hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors active:scale-95"
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
          <div className="flex justify-center space-x-1">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setCapsLock(!capsLock); setShift(false); }}
              className={`h-12 w-24 rounded font-semibold text-white shadow transition-colors active:scale-95 ${capsLock ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 hover:bg-gray-600'}`}
            >
              <ChevronsUp className="w-6 h-6 mx-auto" />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShift(!shift)}
              className={`h-12 w-24 rounded font-semibold text-white shadow transition-colors active:scale-95 ${shift ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 hover:bg-gray-600'}`}
            >
              <ArrowUp className="w-6 h-6 mx-auto" />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleKeyPress(' ', e)}
              className="h-12 flex-grow rounded bg-white dark:bg-gray-600 text-gray-800 dark:text-white font-semibold text-lg shadow hover:bg-gray-100 dark:hover:bg-gray-500 active:scale-95"
            >
              Space
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleKeyPress('backspace', e)}
              className="h-12 w-24 rounded bg-gray-500 hover:bg-gray-600 text-white font-semibold shadow transition-colors active:scale-95"
            >
              <Trash2 className="w-6 h-6 mx-auto" />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleKeyPress('enter', e)}
              className="h-12 w-24 rounded bg-green-600 hover:bg-green-700 text-white font-semibold shadow transition-colors active:scale-95"
            >
              <CornerDownLeft className="w-6 h-6 mx-auto" />
            </button>
          </div>
        </div>
        <button
          onClick={closeKeyboard}
          className="absolute top-0 right-0 -mt-3 -mr-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </Draggable>
  );
};

export default OnScreenKeyboard;
