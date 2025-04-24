//
//   ██████╗██╗  ██╗██████╗  ██████╗ ███╗   ███╗ █████╗      ██╗██╗   ██╗███╗   ███╗██████╗
//  ██╔════╝██║  ██║██╔══██╗██╔═══██╗████╗ ████║██╔══██╗     ██║██║   ██║████╗ ████║██╔══██╗
//  ██║     ███████║██████╔╝██║   ██║██╔████╔██║███████║     ██║██║   ██║██╔████╔██║██████╔╝
//  ██║     ██╔══██║██╔══██╗██║   ██║██║╚██╔╝██║██╔══██║██   ██║██║   ██║██║╚██╔╝██║██╔═══╝
//  ╚██████╗██║  ██║██║  ██║╚██████╔╝██║ ╚═╝ ██║██║  ██║╚█████╔╝╚██████╔╝██║ ╚═╝ ██║██║
//   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝ ╚════╝  ╚═════╝ ╚═╝     ╚═╝╚═╝
//
// === Game Credits ===
// Created by Sebastian C
// Built with p5.play and p5.js

// --- Assets ---
// Character spritesheet: CraftPix.net
//   https://craftpix.net/freebies/free-pixel-art-tiny-hero-sprites/
// Coin spritesheet: La Red Games
//   https://laredgames.itch.io/gems-coins-free
// Background (Parallax): Lil Cthulhu
//   https://lil-cthulhu.itch.io/pixel-art-cave-background

// --- Audio ---
// SFX and music licensed via Epidemic Sound
// Music Loop: "Lunga" by Elm Lake

// sprites
let player, groundSensor, ground, platforms, jumpEffect, walkEffect;
let redLens, blueLens, greenLens;

// effects
let lensImg,
  tintLayer,
  lensTransitionSprite,
  transSquare,
  jumpDustAnim,
  walkDustAnim;

// sound
let ambienceSound, lensSound, completeSound, thudSound, unlockSound;
let ambienceVolume = 0;

let gameState = "menu"; // "menu" or "playing"

// lens variables
let currentLens = "white"; // Active lens (starts with red)
let unlockedLenses = ["white"]; // All lenses unlocked
let lensIndex = 0; // Tracks current lens index

let lensNames = {
  ["white"]: ["Clear"],
  ["red"]: ["Red"],
  ["green"]: ["Green"],
  ["blue"]: ["Blue"],
};
const pickupMap = {
  r: "red",
  g: "green",
  b: "blue",
}; // maps the map‑character → lens color name

// ASSET PRELOAD AND SETUP

function preload() {
  // main sprites
  walkAnim = loadImage("Walk.png");
  idleAnim = loadImage("Idle.png");
  jumpAnim = loadImage("Jump.png");
  lensImg = loadImage("Lens.png");
  jumpDustAnim = loadImage("Dust.png");
  walkDustAnim = loadImage("WalkDust.png");
  // lens items
  redLens = loadImage("Images/RedLens.png");
  greenLens = loadImage("Images/GreenLens.png");
  blueLens = loadImage("Images/BlueLens.png");
  // main sounds
  ambienceSound = loadSound("Music/Ambience.mp3");
  lensSound = loadSound("Sounds/LensSwap.wav");
  completeSound = loadSound("Sounds/LevelComplete.mp3");
  thudSound = loadSound("Sounds/Thud.mp3");
  unlockSound = loadSound("Sounds/LensUnlock.mp3");
  // Parallax
  for (let layer of bgLayers) {
    layer.img = loadImage(layer.imgFile);
  }
}

const MAX_W = 1920;
const MAX_H = 1080;

let levelElem, lensElem;

function setup() {
  // world setup
  const w = min(windowWidth, MAX_W);
  const h = min(windowHeight, MAX_H);

  createCanvas(w, h);

  noSmooth();       // optional: keep pixels crisp

  displayMode("maximize", "pixelated");

  world.gravity.y = 10;

  platforms = new Group();

  // player setup
  player = new Sprite(50, height - 28, 28, 28);
  player.color = "white";
  player.scale = 1.5;
  player.layer = 20;
  player.rotationLock = true;
  player.addAni("walk", walkAnim, { width: 32, height: 32, frames: 5 });
  player.addAni("jump", jumpAnim, { width: 32, height: 32, frames: 8, frameDelay: 5, });
  player.addAni("idle", idleAnim, {
    width: 32,
    height: 32,
    frames: 5,
    frameDelay: 10,
  });
  player.friction = 0;

  spawnX = 50;
  spawnY = height - 100;

  // ground detection
  groundSensor = new Sprite(player.x, player.y + 6, 31, 12, "none");
  groundSensor.visible = false;

  // jump effect setup
  jumpEffect = new Sprite(50, height - 150, 32, 32, "none");
  jumpEffect.color = "white";
  jumpEffect.scale = 2;
  jumpEffect.layer = 5;
  jumpEffect.rotationLock = true;
  jumpEffect.addAni("poof", jumpDustAnim, { width: 32, height: 32, frames: 5, frameDelay: 5, });
  jumpEffect.ani.noLoop();
  jumpEffect.opacity = 0;

  // walk effect setup
  walkEffect = new Sprite(50, height - 150, 32, 32, "none");
  walkEffect.color = "white";
  walkEffect.scale = 1.5;
  walkEffect.opacity = 0;
  walkEffect.layer = 5;
  walkEffect.rotationLock = true;
  walkEffect.addAni("dust", walkDustAnim, { width: 32, height: 32, frames: 6 });

  // cam effects setup
  tintLayer = new Sprite(camera.x, camera.y, windowWidth * 6, windowHeight * 6, "none");

  tintLayer.layer = 5;
  tintLayer.opacity = 0.25;
  tintLayer.color = color("red");

  lensTransitionSprite = new Sprite(camera.x, camera.y, lensImg.width, lensImg.height, "none");

  lensTransitionSprite.image = lensImg;
  lensTransitionSprite.layer = 20; // Draw on top.
  lensTransitionSprite.visible = false; // Hidden until triggered.
  lensTransitionSprite.scale = 100;
  lensTransitionSprite.x = windowWidth / 8;

  transSquare = new Sprite(camera.x, camera.y, 1, 1, "none");
  transSquare.scale = 0;
  transSquare.visible = false;

  // sound setup

  ambienceSound.loop();
  ambienceSound.setVolume(0);

  lensSound.setVolume(0.2);

  camera.x = player.x;
  camera.y = height / 2;

  // VIEW HITBOXES
  allSprites.debug = false;
  p5play.renderStats = false;
  allSprites.pixelPerfect = false;
  allSprites.autoDraw = true;

  frameRate(60);

  menuDiv = createDiv();
  menuDiv.id("menu");

  // create a HUD container
  let uiDiv = createDiv()
  uiDiv.id('game-ui');
  
  // create & parent the level display
  levelElem = createSpan('')
    .id('level-display')
    .parent(uiDiv);

  // create & parent the lens display
  lensElem = createDiv()        // using a div to hold icon + text
    .id('lens-display')
    .parent(uiDiv);

  // init first level
  loadLevel(currentLevelIndex);
  resetLevel();
  //

  showMenu();
}

function draw() {
  background(30);

  if (gameState === "menu") {

    mouse.visible = true;

    player.vel.x = 0
    player.vel.y = 0

    // strobe effect
    const cols = [
      color(255, 0, 0),   // red
      color(0, 255, 0),   // green
      color(0, 0, 255)  // blue
    ];

    // how many frames to spend fading from one color to the next
    const FRAMES_PER = 300;

    const CYCLE_LEN = FRAMES_PER * cols.length;
    let cf = frameCount % CYCLE_LEN;
    let idx = floor(cf / FRAMES_PER);

    let t = map(cf % FRAMES_PER, 0, FRAMES_PER, 0, 1);

    let c1 = cols[idx];
    let c2 = cols[(idx + 1) % cols.length];

    tintLayer.layer = 25
    tintLayer.color = lerpColor(c1, c2, t);
    //
    ambienceVolume = lerp(ambienceVolume, 0, 0.1);
    ambienceSound.setVolume(ambienceVolume);

    menuDiv.size(width, height);

    for (let plat of platforms) {
      if (plat.colorTag === "text") {
        plat.opacity = lerp(plat.opacity, 0, 0.1);
        plat.textSize = lerp(plat.textSize, 20, 0.1);
      }
    }

  } else if (gameState === "playing") {

    tintLayer.layer = 5;
    tintLayer.opacity = 0.25;

    updateUI();
    drawMain();

    mouse.visible = false;
  }
  
  drawParallax();

}

// CORE

function drawMain() {

  let isOnTopOfPlatform = false;

  groundSensor.position.x = player.position.x;
  groundSensor.position.y =
    player.position.y + player.height / 2 + groundSensor.height / 2;

  // --- MAIN PLATFORM LOOP ---
  for (let plat of platforms) {
    plat.friction = 0;
    if (groundSensor.overlapping(plat) && plat.collider === "static") {
      isOnTopOfPlatform = true;
    }
    if (plat.colorTag === "neutral") {
      // next is platform visibility/collisions
      plat.collider = "static";
      plat.opacity = 1;
    } else if (plat.colorTag === "win") {
      plat.collider = "static";
      plat.opacity = 1;
    } else if (plat.colorTag === currentLens) {
      plat.collider = "static";
      plat.opacity = lerp(plat.opacity, 1, 0.025);
    } else if (plat.colorTag === "text") {
      // text hint logic
      plat.collider = "none";
      let distToPlayer = dist(player.x, player.y, plat.x, plat.y);
      let targetOpacity = distToPlayer > 350 ? 0 : 0.75;
      let targetSize = distToPlayer > 350 ? 20 : 25;
      plat.opacity = lerp(plat.opacity, targetOpacity, 0.1);
      plat.textSize = lerp(plat.textSize, targetSize, 0.1);
    } else if (plat.colorTag.startsWith("pickup-")) {
      if (player.overlapping(plat)) {
        // lens item pickup logic
        let colorName = plat.colorTag.split("-")[1];
        if (!unlockedLenses.includes(colorName)) {
          unlockedLenses.push(colorName);
          thudSound.setVolume(0.05);
          thudSound.play();

          unlockSound.setVolume(0.25);
          unlockSound.play();
        }
        plat.remove();
      }
    } else if (plat.colorTag === "checkpoint") {
      if (player.overlapping(plat)) {
        // checkpoint logic
        spawnX = plat.x;
        spawnY = plat.y;
        plat.remove();
      }
    } else {
      // For non-matching platforms, disable collision.
      plat.collider = "none";
      plat.opacity = lerp(plat.opacity, 0, 0.05);
    }

    // then a check to see if they are clipping inside a platform
    if (plat.colorTag === currentLens && !lensTransition.active) {
      // Now check if the player is inside this platform.
      let platLeft = plat.x - plat.width / 2;
      let platRight = plat.x + plat.width / 2;
      let platTop = plat.y - plat.height / 2;
      let platBottom = plat.y + plat.height / 2;

      if (player.x > platLeft && player.x < platRight && player.y > platTop && player.y < platBottom) {
        resetLevel();
        break;
      }
    }

    // lastly, if its a win block give it that specific logic
    if (plat.colorTag === "win" && player.colliding(plat) && !transitionEffect.active) {
      startTransition(plat.x, plat.y, false);

      thudSound.setVolume(1);
      thudSound.play();

      completeSound.setVolume(0.25);
      completeSound.play();

      break;
    }
  }

  // --- Player Movement & Animation ---
  if (transitionEffect.phase != "grow") {
    if (kb.pressing("left")) {
      player.vel.x = -3;
      player.scale.x = -1.5;
      if (isOnTopOfPlatform) {
        player.changeAni("walk");
        walkEffect.scale.x = -1.5;
        walkEffect.x = player.x + 5;
        walkEffect.y = player.y;
      }
    } else if (kb.pressing("right")) {
      player.vel.x = 3;
      player.scale.x = 1.5;
      if (isOnTopOfPlatform) {
        player.changeAni("walk");
        walkEffect.scale.x = 1.5;
        walkEffect.x = player.x - 5;
        walkEffect.y = player.y;
      }
    } else {
      player.vel.x = 0;
      player.changeAni("idle");
    }

    if ((kb.pressing("space") || kb.pressing("up")) && isOnTopOfPlatform && player.vel.y >= 0) {
      player.vel.y = -7;
      jumpEffect.x = player.x;
      jumpEffect.y = player.y - 15;
      jumpEffect.opacity = 1;
      jumpEffect.ani.play(0);
      player.changeAni("jump");
      player.ani.frame = 1;
    }

    if (!groundSensor.overlapping(platforms)) {
      player.changeAni("jump");
    }
  } else {
    player.vel.x = 0;
    player.changeAni("idle");
  }

  jumpEffect.opacity = lerp(jumpEffect.opacity, 0, 0.1);

  if (abs(player.vel.x) > 0.1 && isOnTopOfPlatform) {
    walkEffect.opacity = lerp(walkEffect.opacity, 1, 0.25);
  } else {
    walkEffect.opacity = lerp(walkEffect.opacity, 0, 0.25);
  }

  // --- Lens Switching & Transition Trigger ---
  if ((kb.pressing("q") || kb.pressing("e")) && !lensTransition.active && unlockedLenses.length > 1) {

    if (kb.pressing("q")) {
      lensTransition.direction = -1;
    } else {
      lensTransition.direction = 1;
    }

    lensSound.play();

    lensTransition.active = true;
    lensTransition.phase = "zoomIn";
    lensTransition.pos = { x: width / 2, y: height / 2 };
    lensTransition.scale = 0.5;
    lensTransition.alpha = 255;
    lensTransitionSprite.visible = true; // Show the transition sprite.
  }

  if (transitionEffect.active) {
    if (transitionEffect.phase === "grow") {
      camera.zoom = lerp(camera.zoom, 3, 0.1);
      transitionEffect.progress += 30;
      if (transitionEffect.progress >= transitionEffect.maxSize) {
        if (transitionEffect.levelLoad == false) {
          nextLevel();
        } else {
          startGame();
        }
      }
    } else if (transitionEffect.phase === "fadeOut") {
      transitionEffect.alpha -= 1.5;
      if (transitionEffect.alpha <= 0) {
        transitionEffect.active = false;
        transSquare.visible = false;
      }
      camera.zoom = lerp(camera.zoom, 1.15, 0.01);
    }
  } else {
    camera.zoom = lerp(camera.zoom, 1.15, 0.01);
  }

  // Set the transition sprite’s y position relative to the camera.
  lensTransitionSprite.y = camera.y;

  // --- Update Lens Transition Animation (using sprite, relative to camera) ---
  if (lensTransition.active) {
    if (lensTransition.phase === "zoomIn") {
      // Decrease scale to zoom in.
      lensTransitionSprite.xOffset = 0;
      lensTransitionSprite.scale -= 5;
      lensTransitionSprite.x = camera.x;
      if (lensTransitionSprite.scale <= 50) {
        lensTransition.phase = "moveOut"; // Initialize xOffset for the move phase.
      }
    } else if (lensTransition.phase === "moveOut") {
      // Move the sprite horizontally based on the direction (in/out).
      lensTransitionSprite.xOffset += 150 * lensTransition.direction; // Direction multiplies the offset
      lensTransitionSprite.x = camera.x + lensTransitionSprite.xOffset;

      // Check if we need to switch phase based on direction:
      if ((lensTransition.direction === 1 && lensTransitionSprite.xOffset > width) || (lensTransition.direction === -1 && lensTransitionSprite.xOffset < -width)) {
        // Wrap the offset depending on direction.
        lensTransitionSprite.xOffset =
          lensTransition.direction === 1 ? -width : width;
        lensTransition.phase = "moveIn"; // Switch phase to move inward.

        // Update the lens index depending on the direction of transition.
        lensIndex = (lensIndex + lensTransition.direction + unlockedLenses.length) % unlockedLenses.length;
        currentLens = unlockedLenses[lensIndex];
      }
    } else if (lensTransition.phase === "moveIn") {
      // Move the sprite back towards the center (zero offset).
      lensTransitionSprite.xOffset += 150 * lensTransition.direction; // Direction affects the movement.
      lensTransitionSprite.x = camera.x + lensTransitionSprite.xOffset;

      // When the offset is centered, we transition to zoom out.
      if ((lensTransition.direction === 1 && lensTransitionSprite.xOffset >= 0) || (lensTransition.direction === -1 && lensTransitionSprite.xOffset <= 0)) {
        lensTransitionSprite.xOffset = 0; // Reset offset
        lensTransition.phase = "zoomOut"; // Transition to zoom out.
      }
    } else if (lensTransition.phase === "zoomOut") {
      // Increase scale to zoom out.
      lensTransitionSprite.scale += 5;
      if (lensTransitionSprite.scale >= 100) {
        lensTransition.active = false;
        lensTransitionSprite.visible = false;
      }
    }
  }

  // --- Smooth cam follow, but dont follow if falling
  if (player.y < height + 50) {
    if (transitionEffect.phase != "grow") {
      camera.x = lerp(camera.x, player.x, 0.1);
      camera.y = lerp(camera.y, player.y, 0.01);
    } else {
      camera.x = lerp(camera.x, player.x, 0.25);
      camera.y = lerp(camera.y, player.y, 0.25);
    }
  }

  // --- Reset Level if Player Falls ---
  if (player.y > height + 500) {
    resetLevel();
  }

  // --- Update Tint Layer ---
  let goalColor = color(currentLens);

  tintLayer.x = camera.x;
  tintLayer.y = camera.y;
  tintLayer.color = lerpColor(tintLayer.color, goalColor, 0.1);

  // Draw the transition white square if active.
  if (transitionEffect.active) {
    transSquare.visible = true;
    transSquare.x = player.x;
    transSquare.y = player.y;
    transSquare.scale = transitionEffect.progress;
    transSquare.color = color(255, transitionEffect.alpha);
    transSquare.layer = 19;
    ambienceVolume = lerp(ambienceVolume, 0, 0.1);
  } else {
    ambienceVolume = lerp(ambienceVolume, 0.1, 0.001);
  }

  ambienceSound.setVolume(ambienceVolume);
}

let bgLayers = [
  { imgFile: "Images/Parallax/L1.png", img: undefined, speed: 0.2 },
  { imgFile: "Images/Parallax/L2.png", img: undefined, speed: 0.4 },
  { imgFile: "Images/Parallax/L3.png", img: undefined, speed: 0.6 },
  { imgFile: "Images/Parallax/L4.png", img: undefined, speed: 0.8 },
];

function drawParallax() {
  let camX = camera ? camera.x : 0;
  let z    = camera ? camera.zoom : 1;

  imageMode(CENTER);

  for (let layer of bgLayers) {
    // 1) compute the per-layer zoom factor
    let lz = 1 + (z - 1) * layer.speed;
    let wL = width  * lz;
    let hL = height * lz;

    // 2) horizontal parallax offset, still multiplied by speed * camera zoom
    let o = -camX * layer.speed * z;
    o = ((o % wL) + wL) % wL;

    // 3) draw it tiled, using its own size
    image(layer.img, width/2 + o,           height/2, wL, hL);
    image(layer.img, width/2 + o - wL,      height/2, wL, hL);
  }
}

function keyPressed() {
  if (keyCode === ESCAPE && !transitionEffect.active && !lensTransition.active) {
    if (gameState === "playing") {
      showMenu(true);
      thudSound.setVolume(0.25);
      thudSound.play();
      gameState = "menu";
    } else {
      hideMenu()
      thudSound.setVolume(0.25);
      thudSound.play();
      gameState = "playing";
    }
  }
  if (keyCode === TAB) {
    let fs = fullscreen();
    fullscreen(!fs);
  }
  if (keyCode === ENTER) {
    allSprites.debug = !allSprites.debug;
    p5play.renderStats = !p5play.renderStats;
  }
}

function windowResized() {
  const w = min(windowWidth, MAX_W);
  const h = min(windowHeight, MAX_H);
  resizeCanvas(w, h);
}

// --------------------------------
// LEVEL GENERATION LOGIC AND VARS
// --------------------------------

let tileSize = 50; // how big is each tile in the levels
let currentLevelIndex = 0; // current level index

let hintIndex = 0; // keeps track of what hint to show next

let spawnX, spawnY; // spawn pos for player

// per level hints
let hints = [
  [
    "use A and D to move",
    "press W or Space to jump",
    "press Q or E to swap between lenses",
  ],
];

let levelMaps = [
  [
    "......................................N.....N...............R..................NN",
    ".......................................N...N................R..................NN",
    ".............T..............T...........NNN.................R..................NN",
    ".........................................R............C.....R............C.....NN",
    "........................r.C..............R........NNNNNNNN..R.......NNNNNNNNN..NN",
    "...................NNNNNNNNNNN...........R..................R......NNNN.....N..NN",
    ".T...................NNNNNNN....RRRR...NNNNN.RRRR...........R.NNNNNNNN......N..NN",
    "..............NNN.....NNNNN.............NNN.................R..N....NN......N..NN",
    ".S....................NNNNN..............N..................R...N...NN......NWWNN",
    "NNNNNNNNNNNNNNNNNNNNNNNNNNN..............N..................R....NNNNNNNNNNNNNNNN",
  ],
  [
    ",,,,,N............................................NNNNNNNNNNN....N",
    ",,,,,N............................................NGRGRGRGRGN....N",
    ",,,,,N............................................NRGRGRGRGRN....N",
    ",,,,,N............................................NNNNNNNNNNN....N",
    ",,,,,N.............................................R...G...R.....N",
    ",,,,,N.................gC..........................R...G...R.....N",
    ",,,,,N...............NNNNNNN.......................R...G...R.....N",
    ",,,,,NRRRRRRRNNNN...........NNN....................R.C.G...R.....N",
    ",,,,,N....,NNNNN...............NNN..GGGGG..RRRRR..NNNNNNNNNNNGGGGG",
    ",,,,,N....,NNNN........................................NW........G",
    ",,,,,N...NNNNN.........................................NW........G",
    "NNNNNN...NNNNN.........................................NW........G",
    "......RRR....N.........................................NNNNGGGGGGG",
    ".Sr..........N....................................................",
    "NNNNNNNNNNNNNN.....................................................",
  ],
  [
    "..........................................................................W",
    "........................................................................BBB",
    "......................................NN...RRRRRR...................G......",
    "...........................BBBB.....C.NN...................C....R..........",
    "..................................NNNNNN..................NNN..............",
    "....................GGGG..........NNNNNN...................................",
    "................................................GGGGGGGG...................",
    ".............RRRR..........................................................",
    "...S..r.g.b................................................................",
    "NNNNNNNNNNNNNNN............................................................",
  ],
  [
    "...S........",
    "NNNNNNNNNNNN",
  ],
  [
    "...S........",
    "NNNNNNNNNNNN",
  ],
  [
    "...S........",
    "NNNNNNNNNNNN",
  ],
  [
    "...S........",
    "NNNNNNNNNNNN",
  ],
  [
    "...S........",
    "NNNNNNNNNNNN",
  ]
];

// Create platforms from a grid-based level map.
function createPlatformsFromMap(map) {
  let yOffset = height - map.length * tileSize - 50; // vertical offset
  let xOffset = 0; // horizontal offset if needed

  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      let tile = map[row][col];
      let x = col * tileSize + tileSize / 2 + xOffset;
      let y = row * tileSize + tileSize / 2 + yOffset;

      if (pickupMap[tile]) {
        let colorName = pickupMap[tile];
        if (!unlockedLenses.includes(colorName)) {
          let pickup = new platforms.Sprite(x, y, 8, 8);
          pickup.colorTag = `pickup-${colorName}`;
          pickup.color = color(colorName);
          pickup.opacity = 1;
          pickup.collider = "none";
          pickup.layer = 18;
          //pickup.tint = colorName
          pickup.addAni("red", redLens, {
            width: 16,
            height: 16,
            frames: 5,
            frameDelay: 6,
          });
          pickup.addAni("green", greenLens, {
            width: 16,
            height: 16,
            frames: 5,
            frameDelay: 6,
          });
          pickup.addAni("blue", blueLens, {
            width: 16,
            height: 16,
            frames: 5,
            frameDelay: 6,
          });
          pickup.changeAni(colorName);
          pickup.scale = 3;
        }
        continue;
      }

      // new: spawn-point
      if (tile === "S") {
        spawnX = x;
        spawnY = y;
        continue; // don't fall through to createPlatform(...)
      }

      // checkpoints
      if (tile === "C") {
        let pickup = new platforms.Sprite(x, y, 150, 150);
        pickup.colorTag = "checkpoint";
        pickup.collider = "none";
        pickup.opacity = 0;
        continue; // don't fall through to createPlatform(...)
      }

      if (tile === "R") {
        createPlatform(x, y, tileSize, tileSize, "red");
      } else if (tile === "G") {
        createPlatform(x, y, tileSize, tileSize, "green");
      } else if (tile === "B") {
        createPlatform(x, y, tileSize, tileSize, "blue");
      } else if (tile === "N") {
        createPlatform(x, y, tileSize, tileSize, "neutral");
      } else if (tile === "W") {
        createPlatform(x, y, tileSize, tileSize, "win");
      }
    }
  }

  // First, collect all 'T' hint locations
  let hintPlatforms = [];

  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      let tile = map[row][col];
      if (tile === "T") {
        let x = col * tileSize + tileSize / 2;
        let y =
          row * tileSize + tileSize / 2 + (height - map.length * tileSize - 50);
        hintPlatforms.push({ x, y });
      }
    }
  }

  // Sort hint blocks by x so leftmost comes first
  hintPlatforms.sort((a, b) => a.x - b.x);

  // Create each hint block and assign text from the global hints list
  for (let i = 0; i < hintPlatforms.length; i++) {
    let hintText = hints[currentLevelIndex][hintIndex] ?? "";
    let hintPos = hintPlatforms[i];

    textFont('Pixelify Sans');

    let plat = new platforms.Sprite(hintPos.x, hintPos.y, 0.1, 0.1);
    plat.textSize = 0;
    plat.text = hintText;
    plat.font = "Courier New";
    plat.opacity = 0;
    plat.textColor = "white";
    plat.textStroke = 0;
    plat.color = "transparent"; // no background
    plat.colorTag = "text";
    plat.collider = "none";
    plat.layer = 5;

    hintIndex++;
  }
}

// helper: creates a platform with position, size, and color tag
function createPlatform(x, y, w, h, colorTag) {
  let plat = new platforms.Sprite(x, y, w + 1, h + 1);

  plat.colorTag = colorTag;
  plat.strokeWeight = 5;
  plat.stroke = 15;
  plat.layer = 1;

  if (colorTag === "red") {
    plat.color = color(colorTag);
  } else if (colorTag === "green") {
    plat.color = color(colorTag);
  } else if (colorTag === "blue") {
    plat.color = color(colorTag);
  } else if (colorTag === "win") {
    plat.strokeWeight = 0;
    plat.color = color("white");
    plat.layer = 15;
  } else {
    plat.color = color("black");
  }

  plat.collider = "static";
  plat.friction = 0;
  plat.immovable = true;

  return plat;
}

// load level given index
function loadLevel(index) {
  hintIndex = 0;
  platforms.removeAll();
  createPlatformsFromMap(levelMaps[index]);
  resetLevel();
}

// function to load the next level
function nextLevel() {
  currentLevelIndex++;
  if (currentLevelIndex >= levelMaps.length) {
    currentLevelIndex = 0;
  }
  loadLevel(currentLevelIndex);
  transitionEffect.phase = "fadeOut";
  transitionEffect.alpha = 255;
}

// function to reset the level
function resetLevel() {
  player.x = spawnX;
  player.y = spawnY;

  lensIndex = 0;
  currentLens = "white";

  player.vel.x = 0;
  player.vel.y = 0;

  camera.x = player.x;
  camera.y = player.y;
}

// --------------------------------
// UI, ANIMATION, AND EFFECTS
// --------------------------------

function updateUI() {
  // update the level number
  levelElem.html(`LEVEL ${currentLevelIndex + 1}`);

  // update the lens icon + name
  // lensNames[currentLens] is an array, so grab [0]
  let name = lensNames[currentLens][0];
  lensElem.html(
    `<span class="lens-circle" style="background: ${currentLens};"></span>` +
    `${name}`
  );
}


function clearLevelButtons() {
  const container = menuDiv.elt;

  // as long as there is at least one child, remove it
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

// main menu code
function showMenu(showResume) {

  clearLevelButtons(); // clear out any old buttons

  menuDiv.style("pointer-events", "auto");

  // — title —
  let title = createElement("h1", "ChromaJump");
  title.parent(menuDiv);
  title.class("menu-title");

  if (showResume) {

    // — subtitle —
    let subtitle = createElement("p", "Paused");
    subtitle.parent(menuDiv);
    subtitle.class("menu-subtitle");

    let b = createButton(`Resume`);
    b.parent(menuDiv);           // put it inside our #menu div
    b.class("menu-button");      // give it the CSS class
    b.mousePressed(() => {
      hideMenu()
      gameState = "playing";
      thudSound.setVolume(0.25);
      thudSound.play();
    });
  } else {

    // — subtitle —
    let subtitle = createElement("p", "Select a level:");
    subtitle.parent(menuDiv);
    subtitle.class("menu-subtitle");

  }

  for (let i = 0; i < levelMaps.length; i++) {
    let b = createButton(`LEVEL ${i + 1}`);
    b.parent(menuDiv);           // put it inside our #menu div
    b.class("menu-button");      // give it the CSS class
    b.mousePressed(() => {
      currentLevelIndex = i;
      hideMenu()
      gameState = "playing";
      startTransition(camera.x, camera.y, true);
      thudSound.setVolume(0.25);
      thudSound.play();
      completeSound.setVolume(0.25);
      completeSound.play();
    });
  }
  menuDiv.show();
}

function hideMenu() {

  menuDiv.hide();
  clearLevelButtons();

}

// function to load level
function startGame() {
  loadLevel(currentLevelIndex);
  resetLevel();
  // transition
  transitionEffect.phase = "fadeOut";
  transitionEffect.alpha = 255;
}

let transitionEffect = {
  // Transition effect for level win.
  active: false,
  phase: "", // "grow" or "fadeOut"
  progress: 0, // current size of the square
  originWorld: { x: 0, y: 0 }, // win block position (in world coordinates)
  maxSize: 0, // maximum size needed to cover the screen
  alpha: 255, // opacity (used during fadeOut)
  levelLoad: false
};

function startTransition(xPos, yPos, levelLoad) {
  transitionEffect.active = true;
  transitionEffect.phase = "grow";
  transitionEffect.progress = 0;
  transitionEffect.alpha = 255;
  transitionEffect.originWorld = { x: xPos, y: yPos };
  transitionEffect.levelLoad = levelLoad
  transitionEffect.maxSize = 1500;
}

let lensTransition = {
  // Lens transition effect for lens cycling.
  active: false,
  phase: "", // "zoomIn", "moveRight", "moveLeft", "zoomOut"
  pos: { x: 0, y: 0 }, // current screen position
  scale: 1, // current scale factor (multiplier)
  alpha: 255, // current opacity (0-255)
  direction: 0,
};
