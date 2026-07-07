import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';

// -------------------------------------------------------------
// GAME CONSTANTS
// -------------------------------------------------------------
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPACESHIP_WIDTH = 46;
const SPACESHIP_HEIGHT = 50;
const SPACESHIP_SPEED = 8; // Pixels to move per frame
const SPACESHIP_Y_FROM_BOTTOM = 180; // Distance from screen bottom to spaceship base
const SPACESHIP_Y = SCREEN_HEIGHT - SPACESHIP_Y_FROM_BOTTOM - SPACESHIP_HEIGHT;

const ASTEROID_SPAWN_COUNT = 3; // Number of concurrent falling asteroids
const ASTEROID_MIN_SIZE = 30;
const ASTEROID_MAX_SIZE = 55;
const ASTEROID_MIN_SPEED = 4;
const ASTEROID_MAX_SPEED = 9;

// -------------------------------------------------------------
// CUSTOM RETRO BEVELED BUTTON COMPONENT (PIXEL ART STYLE)
// -------------------------------------------------------------
function RetroButton({
  onPress,
  onPressIn,
  onPressOut,
  children,
  style,
  textStyle,
  fontsLoaded,
  maskColorTopLeft = '#0B0820',
  maskColorBottomRight = '#1A0B36',
}) {
  const pixelFont = fontsLoaded
    ? 'PressStart2P'
    : (Platform.OS === 'ios' ? 'Courier New' : 'monospace');

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.retroBtn,
        pressed && styles.retroBtnPressed,
        style,
      ]}
    >
      {/* Background Masks to Clip Corners (matches screen background color) */}
      <View style={[styles.maskTopLeft, { backgroundColor: maskColorTopLeft }]} />
      <View style={[styles.maskBottomRight, { backgroundColor: maskColorBottomRight }]} />

      {/* Button Interior */}
      <View style={styles.retroBtnInterior}>
        {children ? (
          typeof children === 'string' ? (
            <Text style={[styles.retroBtnText, { fontFamily: pixelFont }, textStyle]}>
              {children}
            </Text>
          ) : (
            children
          )
        ) : null}
      </View>

      {/* Cyan Outlines */}
      <View style={styles.borderTop} />
      <View style={styles.borderBottom} />
      <View style={styles.borderLeft} />
      <View style={styles.borderRight} />

      {/* Bevel Diagonals */}
      <View style={styles.diagonalTopLeft} />
      <View style={styles.diagonalBottomRight} />

      {/* Corner Ornaments */}
      <View style={styles.cornerAccentTopLeft} />
      <View style={styles.cornerAccentBottomRight} />
    </Pressable>
  );
}

// -------------------------------------------------------------
// MAIN APP COMPONENT
// -------------------------------------------------------------
export default function App() {
  // Font Loading State
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Game state: 'START' | 'PLAYING' | 'GAME_OVER'
  const [gameState, setGameState] = useState('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Positions and Entities
  const [spaceshipX, setSpaceshipX] = useState((SCREEN_WIDTH - SPACESHIP_WIDTH) / 2);
  const [asteroids, setAsteroids] = useState([]);
  
  // Animation/Visual State
  const [thrusterFlameToggle, setThrusterFlameToggle] = useState(false);

  // Refs for the physics/movement loop
  const gameStateRef = useRef('START');
  const spaceshipXRef = useRef((SCREEN_WIDTH - SPACESHIP_WIDTH) / 2);
  const asteroidsRef = useRef([]);
  const requestRef = useRef(null);

  // Controller inputs
  const moveLeftActive = useRef(false);
  const moveRightActive = useRef(false);

  // Load Google Font Dynamically on mount
  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'PressStart2P': 'https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf',
        });
      } catch (error) {
        console.warn('Could not load PressStart2P pixel font, using default monospace', error);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  // Sync state changes with refs
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    spaceshipXRef.current = spaceshipX;
  }, [spaceshipX]);

  useEffect(() => {
    asteroidsRef.current = asteroids;
  }, [asteroids]);

  // Load High Score on App Startup
  useEffect(() => {
    loadHighScore();
  }, []);

  const loadHighScore = async () => {
    try {
      const storedHighScore = await AsyncStorage.getItem('@high_score');
      if (storedHighScore !== null) {
        setHighScore(parseInt(storedHighScore, 10));
      }
    } catch (error) {
      console.error('Error loading high score from AsyncStorage', error);
    }
  };

  const saveNewHighScore = async (newScore) => {
    try {
      await AsyncStorage.setItem('@high_score', newScore.toString());
      setHighScore(newScore);
    } catch (error) {
      console.error('Error saving high score to AsyncStorage', error);
    }
  };

  // Thruster Flame flickering animation timer
  useEffect(() => {
    const flickerInterval = setInterval(() => {
      setThrusterFlameToggle(prev => !prev);
    }, 100);
    return () => clearInterval(flickerInterval);
  }, []);

  // Generate background stars
  const backgroundStars = useMemo(() => {
    const starsArray = [];
    for (let i = 0; i < 45; i++) {
      starsArray.push({
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.7 + 0.3,
      });
    }
    return starsArray;
  }, []);

  // Helper for pixel font family
  const pixelFont = fontsLoaded
    ? 'PressStart2P'
    : (Platform.OS === 'ios' ? 'Courier New' : 'monospace');

  // Start/Restart Game
  const startGame = () => {
    setScore(0);
    const initialShipX = (SCREEN_WIDTH - SPACESHIP_WIDTH) / 2;
    setSpaceshipX(initialShipX);
    spaceshipXRef.current = initialShipX;

    const initialAsteroids = [];
    for (let i = 0; i < ASTEROID_SPAWN_COUNT; i++) {
      initialAsteroids.push(generateAsteroid(i));
    }
    setAsteroids(initialAsteroids);
    asteroidsRef.current = initialAsteroids;

    setGameState('PLAYING');
    gameStateRef.current = 'PLAYING';

    requestRef.current = requestAnimationFrame(updateGameFrame);
  };

  const generateAsteroid = (id) => {
    const size = Math.random() * (ASTEROID_MAX_SIZE - ASTEROID_MIN_SIZE) + ASTEROID_MIN_SIZE;
    return {
      id: id,
      x: Math.random() * (SCREEN_WIDTH - size - 20) + 10,
      y: -size - (Math.random() * 200),
      size: size,
      speed: Math.random() * (ASTEROID_MAX_SPEED - ASTEROID_MIN_SPEED) + ASTEROID_MIN_SPEED,
    };
  };

  const updateGameFrame = () => {
    if (gameStateRef.current !== 'PLAYING') return;

    // Move spaceship based on controls
    let currentX = spaceshipXRef.current;
    if (moveLeftActive.current) {
      currentX = Math.max(10, currentX - SPACESHIP_SPEED);
    }
    if (moveRightActive.current) {
      currentX = Math.min(SCREEN_WIDTH - SPACESHIP_WIDTH - 10, currentX + SPACESHIP_SPEED);
    }
    
    if (currentX !== spaceshipXRef.current) {
      setSpaceshipX(currentX);
      spaceshipXRef.current = currentX;
    }

    // Move asteroids
    let scoreIncrement = 0;
    const updatedAsteroids = asteroidsRef.current.map(ast => {
      let nextY = ast.y + ast.speed;

      if (nextY > SCREEN_HEIGHT) {
        scoreIncrement++;
        return generateAsteroid(ast.id);
      }
      return { ...ast, y: nextY };
    });

    if (scoreIncrement > 0) {
      setScore(prevScore => prevScore + scoreIncrement);
    }

    setAsteroids(updatedAsteroids);
    asteroidsRef.current = updatedAsteroids;

    requestRef.current = requestAnimationFrame(updateGameFrame);
  };

  // Collision detection
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const shipBox = {
      left: spaceshipX,
      right: spaceshipX + SPACESHIP_WIDTH,
      top: SPACESHIP_Y,
      bottom: SPACESHIP_Y + SPACESHIP_HEIGHT,
    };

    for (let i = 0; i < asteroids.length; i++) {
      const ast = asteroids[i];
      const buffer = ast.size * 0.15;
      const asteroidBox = {
        left: ast.x + buffer,
        right: ast.x + ast.size - buffer,
        top: ast.y + buffer,
        bottom: ast.y + ast.size - buffer,
      };

      if (
        shipBox.left < asteroidBox.right &&
        shipBox.right > asteroidBox.left &&
        shipBox.top < asteroidBox.bottom &&
        shipBox.bottom > asteroidBox.top
      ) {
        triggerGameOver();
        break;
      }
    }
  }, [asteroids, spaceshipX, gameState]);

  const triggerGameOver = () => {
    setGameState('GAME_OVER');
    gameStateRef.current = 'GAME_OVER';

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }

    if (score > highScore) {
      saveNewHighScore(score);
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.rootContainer}>
      <StatusBar style="light" />
      
      {/* Background Starry Gradient */}
      <LinearGradient
        colors={['#070514', '#120B2E', '#2B0E4B']}
        style={StyleSheet.absoluteFill}
      >
        {backgroundStars.map(star => (
          <View
            key={star.id}
            style={[
              styles.star,
              {
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                opacity: star.opacity,
              },
            ]}
          />
        ))}
      </LinearGradient>

      <SafeAreaView style={styles.safeArea}>
        {/* Score & HUD Top Panel */}
        <View style={styles.hudContainer}>
          <View style={styles.hudBadge}>
            <Text style={[styles.hudLabel, { fontFamily: pixelFont }]}>SCORE</Text>
            <Text style={[styles.hudValue, { fontFamily: pixelFont }]}>{score}</Text>
          </View>
          <View style={styles.hudBadge}>
            <Text style={[styles.hudLabel, { fontFamily: pixelFont }]}>BEST</Text>
            <Text style={[styles.hudValue, { fontFamily: pixelFont }]}>{highScore}</Text>
          </View>
        </View>

        {/* ----------------------------------------- */}
        {/* PLAYING CANVAS */}
        {/* ----------------------------------------- */}
        {gameState === 'PLAYING' && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Asteroids */}
            {asteroids.map(ast => (
              <View
                key={ast.id}
                style={[
                  styles.asteroid,
                  {
                    left: ast.x,
                    top: ast.y,
                    width: ast.size,
                    height: ast.size,
                    borderRadius: ast.size / 2,
                  },
                ]}
              >
                <View style={[styles.crater, { top: '20%', left: '15%', width: '30%', height: '30%', borderRadius: 99 }]} />
                <View style={[styles.crater, { bottom: '20%', right: '20%', width: '25%', height: '25%', borderRadius: 99 }]} />
                <View style={[styles.crater, { top: '50%', right: '15%', width: '15%', height: '15%', borderRadius: 99 }]} />
              </View>
            ))}

            {/* Spaceship */}
            <View style={[styles.spaceship, { left: spaceshipX, top: SPACESHIP_Y }]}>
              {thrusterFlameToggle && <View style={styles.thrusterFlame} />}
              <View style={styles.shipWings} />
              <View style={styles.shipBody} />
              <View style={styles.shipCockpit} />
            </View>
          </View>
        )}

        {/* ----------------------------------------- */}
        {/* START SCREEN OVERLAY */}
        {/* ----------------------------------------- */}
        {gameState === 'START' && (
          <View style={styles.overlayContainer}>
            <View style={styles.titleCard}>
              <Text style={[styles.gameTitleAccent, { fontFamily: pixelFont }]}>SPACE ESCAPE</Text>
              <Text style={[styles.gameTitleMain, { fontFamily: pixelFont }]}>RUNNER</Text>
            </View>
            
            <Text style={[styles.gameSubtitle, { fontFamily: pixelFont }]}>
              EVADE ASTEROIDS. SURVIVE.
            </Text>

            <RetroButton
              onPress={startGame}
              fontsLoaded={fontsLoaded}
              maskColorTopLeft="#0A081D"
              maskColorBottomRight="#170A34"
            >
              PLAY
            </RetroButton>
          </View>
        )}

        {/* ----------------------------------------- */}
        {/* GAME OVER SCREEN OVERLAY */}
        {/* ----------------------------------------- */}
        {gameState === 'GAME_OVER' && (
          <View style={styles.overlayContainer}>
            <Text style={[styles.gameOverTitle, { fontFamily: pixelFont }]}>
              COLLISION
            </Text>
            <Text style={[styles.gameOverSubtitle, { fontFamily: pixelFont }]}>
              SHIP DESTROYED
            </Text>
            
            <View style={styles.resultsCard}>
              <View style={styles.resultsRow}>
                <Text style={[styles.resultsLabel, { fontFamily: pixelFont }]}>FINAL SCORE</Text>
                <Text style={[styles.resultsVal, { fontFamily: pixelFont }]}>{score}</Text>
              </View>
              {score >= highScore && score > 0 && (
                <Text style={[styles.newRecordBadge, { fontFamily: pixelFont }]}>
                  NEW RECORD!
                </Text>
              )}
            </View>

            <RetroButton
              onPress={startGame}
              fontsLoaded={fontsLoaded}
              maskColorTopLeft="#0A081D"
              maskColorBottomRight="#170A34"
              textStyle={{ color: '#FFE600', textShadowColor: 'rgba(255, 230, 0, 0.4)' }}
            >
              RETRY
            </RetroButton>
          </View>
        )}

        {/* ----------------------------------------- */}
        {/* HUD BOTTOM CONTROLLER PANEL */}
        {/* ----------------------------------------- */}
        {gameState === 'PLAYING' && (
          <View style={styles.controlsWrapper}>
            <View style={styles.controlsCard}>
              {/* Left Button */}
              <RetroButton
                onPressIn={() => {
                  moveLeftActive.current = true;
                }}
                onPressOut={() => {
                  moveLeftActive.current = false;
                }}
                style={styles.controlRetroBtn}
                fontsLoaded={fontsLoaded}
                maskColorTopLeft="#1D0E44"
                maskColorBottomRight="#240E48"
              >
                <View style={styles.controlBtnInner}>
                  <Text style={[styles.controlArrowText, { fontFamily: pixelFont }]}>◀</Text>
                  <Text style={[styles.controlSubText, { fontFamily: pixelFont }]}>LEFT</Text>
                </View>
              </RetroButton>

              {/* Right Button */}
              <RetroButton
                onPressIn={() => {
                  moveRightActive.current = true;
                }}
                onPressOut={() => {
                  moveRightActive.current = false;
                }}
                style={styles.controlRetroBtn}
                fontsLoaded={fontsLoaded}
                maskColorTopLeft="#1D0E44"
                maskColorBottomRight="#240E48"
              >
                <View style={styles.controlBtnInner}>
                  <Text style={[styles.controlArrowText, { fontFamily: pixelFont }]}>▶</Text>
                  <Text style={[styles.controlSubText, { fontFamily: pixelFont }]}>RIGHT</Text>
                </View>
              </RetroButton>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// -------------------------------------------------------------
// STYLE SHEET DEFINITION
// -------------------------------------------------------------
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#070514',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 10 : 10,
    justifyContent: 'space-between',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  hudContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    zIndex: 10,
  },
  hudBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  hudLabel: {
    color: '#00F0FF',
    fontSize: 8,
    marginBottom: 4,
  },
  hudValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Game Screen Overlays
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 20,
  },
  titleCard: {
    alignItems: 'center',
    marginBottom: 15,
  },
  gameTitleAccent: {
    color: '#00F0FF',
    fontSize: 18,
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 240, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 5,
  },
  gameTitleMain: {
    color: '#FFFFFF',
    fontSize: 34,
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  gameSubtitle: {
    color: '#8C8AA7',
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 50,
  },
  gameOverTitle: {
    color: '#FF0055',
    fontSize: 26,
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 0, 85, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 10,
  },
  gameOverSubtitle: {
    color: '#A9A7C5',
    fontSize: 12,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 30,
  },
  resultsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  resultsLabel: {
    color: '#8C8AA7',
    fontSize: 10,
    letterSpacing: 1,
  },
  resultsVal: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  newRecordBadge: {
    color: '#FFE600',
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 12,
    textAlign: 'center',
  },
  // Game Entities Styling
  spaceship: {
    position: 'absolute',
    width: SPACESHIP_WIDTH,
    height: SPACESHIP_HEIGHT,
    alignItems: 'center',
  },
  shipBody: {
    position: 'absolute',
    top: 5,
    width: 18,
    height: 38,
    backgroundColor: '#00F0FF',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    zIndex: 3,
  },
  shipWings: {
    position: 'absolute',
    bottom: 5,
    width: SPACESHIP_WIDTH,
    height: 18,
    backgroundColor: '#5800FF',
    borderRadius: 6,
    zIndex: 2,
  },
  shipCockpit: {
    position: 'absolute',
    top: 13,
    width: 8,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    opacity: 0.85,
    zIndex: 4,
  },
  thrusterFlame: {
    position: 'absolute',
    bottom: -15,
    width: 12,
    height: 16,
    backgroundColor: '#FF6A00',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    zIndex: 1,
    opacity: 0.9,
  },
  asteroid: {
    position: 'absolute',
    backgroundColor: '#4A4A50',
    borderColor: '#7A7A80',
    borderWidth: 2,
    overflow: 'hidden',
  },
  crater: {
    position: 'absolute',
    backgroundColor: '#303035',
    opacity: 0.8,
  },
  // Bottom Controls Panel
  controlsWrapper: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 15,
    zIndex: 10,
  },
  controlsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  controlRetroBtn: {
    flex: 1,
    height: 68,
    marginVertical: 0,
  },
  controlBtnInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlArrowText: {
    color: '#00F0FF',
    fontSize: 16,
    marginBottom: 2,
  },
  controlSubText: {
    color: '#8C8AA7',
    fontSize: 8,
    letterSpacing: 1,
  },
  // -------------------------------------------------------------
  // CUSTOM RETRO BUTTON INTERNAL STYLING
  // -------------------------------------------------------------
  retroBtn: {
    width: 250,
    height: 58,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  retroBtnPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  retroBtnInterior: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    backgroundColor: 'rgba(9, 28, 41, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  retroBtnText: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 240, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  // Masks to block corner edges
  maskTopLeft: {
    position: 'absolute',
    top: -12,
    left: -12,
    width: 24,
    height: 24,
    transform: [{ rotate: '45deg' }],
    zIndex: 2,
  },
  maskBottomRight: {
    position: 'absolute',
    bottom: -12,
    right: -12,
    width: 24,
    height: 24,
    transform: [{ rotate: '45deg' }],
    zIndex: 2,
  },
  // Cyan Outlines
  borderTop: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 0,
    height: 3,
    backgroundColor: '#00F0FF',
    zIndex: 3,
  },
  borderBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 16,
    height: 3,
    backgroundColor: '#00F0FF',
    zIndex: 3,
  },
  borderLeft: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 0,
    width: 3,
    backgroundColor: '#00F0FF',
    zIndex: 3,
  },
  borderRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 16,
    width: 3,
    backgroundColor: '#00F0FF',
    zIndex: 3,
  },
  // Bevel Diagonals
  diagonalTopLeft: {
    position: 'absolute',
    top: 6.5,
    left: -3,
    width: 22,
    height: 3,
    backgroundColor: '#00F0FF',
    transform: [{ rotate: '-45deg' }],
    zIndex: 3,
  },
  diagonalBottomRight: {
    position: 'absolute',
    bottom: 6.5,
    right: -3,
    width: 22,
    height: 3,
    backgroundColor: '#00F0FF',
    transform: [{ rotate: '-45deg' }],
    zIndex: 3,
  },
  // Accents inside the button corner cuts
  cornerAccentTopLeft: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 4,
    height: 4,
    backgroundColor: '#00F0FF',
    zIndex: 4,
  },
  cornerAccentBottomRight: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 4,
    height: 4,
    backgroundColor: '#00F0FF',
    zIndex: 4,
  },
});
