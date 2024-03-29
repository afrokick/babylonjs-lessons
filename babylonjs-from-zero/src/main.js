const canvas = document.querySelector("#game-canvas");
const engine = new BABYLON.Engine(canvas, true, { stencil: true }, true);

const createScene = function () {
  const CAMERA_HEIGHT = 2;
  const CAMERA_RADIUS = 25;
  const CAMERA_ALPHA = Math.PI * 0.25;
  const CAMERA_BETA = Math.PI * 0.3;
  // Creates a basic Babylon Scene object
  const scene = new BABYLON.Scene(engine);

  const camera = new BABYLON.ArcRotateCamera(
    "camera1",
    CAMERA_ALPHA,
    CAMERA_BETA,
    CAMERA_RADIUS,
    new BABYLON.Vector3(0, CAMERA_HEIGHT, 0),
    scene
  );
  camera.minZ = 0.01;

  // Creates a light, aiming 0,1,0
  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  // Dim the light a small amount 0 - 1
  light.intensity = 1;

  const MAP_SIZE = 200;
  const MAP_MAX_HEIGHT = 25;

  // Built-in 'ground' shape.
  const ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap(
    "ground",
    "./public/heightMap.jpg",
    {
      width: MAP_SIZE,
      height: MAP_SIZE,
      subdivisions: 16,
      minHeight: 0,
      maxHeight: MAP_MAX_HEIGHT,
      onReady: () => {
        createTrees();
      },
    },
    scene
  );
  ground.isPickable = true;

  const material = new BABYLON.StandardMaterial("groundMaterial", scene);

  const groundTexture = new BABYLON.Texture(
    "https://playground.babylonjs.com/textures/floor.png"
  );
  groundTexture.uScale = groundTexture.vScale = MAP_SIZE / 2.5;
  material.diffuseTexture = groundTexture;

  const groundBumpTexture = new BABYLON.Texture(
    "https://playground.babylonjs.com/textures/floor_bump.png"
  );
  groundBumpTexture.uScale = groundBumpTexture.vScale = MAP_SIZE / 2.5;
  material.bumpTexture = groundBumpTexture;

  material.specularColor = BABYLON.Color3.White().scale(0.3);

  ground.material = material;

  BABYLON.SceneLoader.ImportMeshAsync(
    null,
    "./public/",
    "Market_SecondAge_Level3.gltf",
    scene
  ).then((result) => {
    const [root] = result.meshes;
    root.scaling.setAll(5);
  });

  BABYLON.SceneLoader.ImportMeshAsync(
    null,
    "./public/",
    "Adventurer.gltf",
    scene
  ).then((result) => {
    const [playerRoot] = result.meshes;
    const playIdle = () => {
      result.animationGroups.forEach((ag) => {
        if (ag.name === "Idle") {
          ag.start(true);
        } else {
          ag.stop();
        }
      });
    };

    const playRun = () => {
      result.animationGroups.forEach((ag) => {
        if (ag.name === "Run") {
          ag.start(true);
        } else {
          ag.stop();
        }
      });
    };

    playIdle();

    playerRoot.rotationQuaternion = BABYLON.Quaternion.Identity();

    const targetPoint = playerRoot.position.clone();
    const targetRotation = playerRoot.rotationQuaternion.clone();

    scene.onPointerObservable.add((eventData) => {
      if (eventData.type !== BABYLON.PointerEventTypes.POINTERPICK) return;

      const pickInfo = eventData.pickInfo;
      const pickedMesh = pickInfo?.pickedMesh;

      if (pickedMesh == null) return;

      if (pickedMesh.name !== "ground") return;

      targetPoint.copyFrom(eventData.pickInfo.pickedPoint);

      const dir = targetPoint.subtract(playerRoot.position).normalize();
      dir.y = 0;
      targetRotation.copyFrom(
        BABYLON.Quaternion.FromLookDirectionLH(dir, BABYLON.Vector3.UpReadOnly)
      );
    });

    const speed = 4;
    const rotLerpSpeed = 16;
    const rotAmount = 5;
    const maxDelta = speed * 0.01;

    const axis = {
      f: 0,
      r: 0,
    };

    const keys = {
      KeyW: 1,
      KeyS: -1,
      KeyA: -1,
      KeyD: 1,
    };

    const pressedKeys = {};

    scene.onKeyboardObservable.add((eventData) => {
      const code = eventData.event.code;

      const getKey = (c) => {
        return !!pressedKeys[c] ? keys[c] : 0;
      };

      if (eventData.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
        pressedKeys[code] = 1;
      } else if (eventData.type === BABYLON.KeyboardEventTypes.KEYUP) {
        pressedKeys[code] = 0;
      }

      axis.f = getKey("KeyW") + getKey("KeyS");
      axis.r = getKey("KeyA") + getKey("KeyD");
    });

    scene.onBeforeRenderObservable.add(() => {
      const deltaTime = (scene.deltaTime ?? 1) / 1000;

      if (Math.abs(axis.f) > 0.001) {
        const nextPoint = playerRoot.position.add(
          playerRoot.forward.scale(axis.f * 0.3)
        );

        targetPoint.copyFrom(nextPoint);

        const origin = new BABYLON.Vector3(
          targetPoint.x,
          MAP_MAX_HEIGHT + 0.1,
          targetPoint.z
        );
        const ray = new BABYLON.Ray(
          origin,
          BABYLON.Vector3.Down(),
          MAP_MAX_HEIGHT + 0.2
        );

        const result = scene.pickWithRay(ray, (mesh) => mesh === ground);
        targetPoint.y = result.pickedPoint?.y ?? 0;
      }

      if (Math.abs(axis.r) > 0.001) {
        targetRotation.multiplyInPlace(
          BABYLON.Quaternion.RotationAxis(
            BABYLON.Vector3.UpReadOnly,
            axis.r * rotAmount * deltaTime
          )
        );
      }

      BABYLON.Quaternion.SlerpToRef(
        playerRoot.rotationQuaternion,
        targetRotation,
        rotLerpSpeed * deltaTime,
        playerRoot.rotationQuaternion
      );

      const diff = targetPoint.subtract(playerRoot.position);
      if (diff.length() < maxDelta) {
        playIdle();
        return;
      }

      playRun();

      const dir = diff.normalize();

      const velocity = dir.scale(speed * deltaTime);
      playerRoot.position.addInPlace(velocity);

      camera.target.copyFrom(playerRoot.position);
      camera.target.y += CAMERA_HEIGHT;
    });
  });

  function createTrees() {
    BABYLON.SceneLoader.ImportMeshAsync(
      null,
      "./public/",
      "Resource_PineTree.gltf",
      scene
    ).then((result) => {
      const [root] = result.meshes;
      root.scaling.setAll(1);

      const childMeshes = root.getChildMeshes(false);
      const merged = BABYLON.Mesh.MergeMeshes(
        childMeshes,
        true,
        true,
        undefined,
        false,
        true
      );
      merged.isPickable = false;
      merged.checkCollisions = false;

      const COUNT = 20_000;
      const offset = 5;
      const max = MAP_SIZE / 2 - 2 - offset;

      const getPos = () =>
        (offset + Math.random() * max) * (Math.random() > 0.5 ? 1 : -1);

      const bufferMatrices = new Float32Array(16 * COUNT);

      const origin = new BABYLON.Vector3(0, MAP_MAX_HEIGHT + 0.1, 0);
      const ray = new BABYLON.Ray(
        origin,
        BABYLON.Vector3.Down(),
        MAP_MAX_HEIGHT + 0.2
      );

      for (let i = 0; i < COUNT; i++) {
        const x = getPos();
        const z = getPos();
        origin.x = x;
        origin.z = z;
        const result = scene.pickWithRay(ray, (mesh) => mesh === ground);
        const y = result.pickedPoint?.y ?? 0;

        const pos = new BABYLON.Vector3(x, y, z);
        const scale = BABYLON.Vector3.One().setAll(
          BABYLON.Scalar.RandomRange(2, 10)
        );
        const angle = BABYLON.Scalar.RandomRange(0, 2 * Math.PI);
        const rot = BABYLON.Quaternion.FromEulerAngles(0, angle, 0);

        const matrix = BABYLON.Matrix.Compose(scale, rot, pos);

        matrix.copyToArray(bufferMatrices, i * 16);
      }

      merged.thinInstanceSetBuffer("matrix", bufferMatrices, 16, true);

      merged.alwaysSelectAsActiveMesh = true;
    });
  }

  return scene;
};

const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});

async function addInspectorForScene(scene) {
  const switchDebugLayer = () => {
    if (scene.debugLayer.isVisible()) {
      scene.debugLayer.hide();
    } else {
      scene.debugLayer.show({ overlay: true });
    }
  };

  // hide/show the Inspector
  window.addEventListener("keydown", async (ev) => {
    // Shift+Ctrl+Alt+I
    if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
      const debuggerScript = document.querySelector("script[inspector]");

      if (!debuggerScript) {
        console.log(`Start loading inspector...`);
        const s = document.createElement("script");
        s.setAttribute("inspector", "true");
        s.src =
          "https://cdn.babylonjs.com/inspector/babylon.inspector.bundle.js";

        s.onload = () => {
          console.log(`Inspector loaded!`);
          switchDebugLayer();
        };
        s.onerror = () => {
          console.log(`Inspector failed to load`);
        };
        document.body.appendChild(s);
        return;
      }

      switchDebugLayer();
    }
  });
}

addInspectorForScene(scene);
