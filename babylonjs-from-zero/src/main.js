import * as BABYLON from "https://esm.sh/@babylonjs/core@5.44.0/Legacy/legacy";
import "https://esm.sh/@babylonjs/loaders@5.44.0/glTF";

const canvas = document.querySelector("#game-canvas");
const engine = new BABYLON.Engine(canvas, true, { stencil: true }, true);

const createScene = function () {
  // Creates a basic Babylon Scene object
  const scene = new BABYLON.Scene(engine);
  // Creates and positions a free camera
  const camera = new BABYLON.FreeCamera(
    "camera1",
    new BABYLON.Vector3(0, 5, -10),
    scene
  );
  camera.minZ = 0.01;
  // Targets the camera to scene origin
  camera.setTarget(BABYLON.Vector3.Zero());
  // Attaches the camera to the canvas
  camera.attachControl(canvas, true);
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
    const [root] = result.meshes;
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

    root.rotationQuaternion = BABYLON.Quaternion.Identity();

    const targetPoint = root.position.clone();
    const targetRotation = root.rotationQuaternion.clone();

    scene.onPointerObservable.add((eventData) => {
      if (eventData.type !== BABYLON.PointerEventTypes.POINTERPICK) return;

      const pickInfo = eventData.pickInfo;
      const pickedMesh = pickInfo?.pickedMesh;

      if (pickedMesh == null) return;

      if (pickedMesh.name !== "ground") return;

      targetPoint.copyFrom(eventData.pickInfo.pickedPoint);

      const dir = targetPoint.subtract(root.position).normalize();
      targetRotation.copyFrom(
        BABYLON.Quaternion.FromLookDirectionLH(dir, root.up)
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
        const nextPoint = root.position.add(root.forward.scale(axis.f * 0.3));

        targetPoint.copyFrom(nextPoint);
      }

      if (Math.abs(axis.r) > 0.001) {
        targetRotation.multiplyInPlace(
          BABYLON.Quaternion.RotationAxis(
            root.up,
            axis.r * rotAmount * deltaTime
          )
        );
      }

      BABYLON.Quaternion.SlerpToRef(
        root.rotationQuaternion,
        targetRotation,
        rotLerpSpeed * deltaTime,
        root.rotationQuaternion
      );

      const diff = targetPoint.subtract(root.position);
      if (diff.length() < maxDelta) {
        playIdle();
        return;
      }

      playRun();

      const dir = diff.normalize();

      const velocity = dir.scale(speed * deltaTime);
      root.position.addInPlace(velocity);
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

window.addEventListener("keydown", (ev) => {
  // Shift+Ctrl+Alt+I
  if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
    if (scene.debugLayer.isVisible()) {
      scene.debugLayer.hide();
    } else {
      scene.debugLayer.show({ overlay: true });
    }
  }
});

window.addEventListener("resize", () => {
  engine.resize();
});
