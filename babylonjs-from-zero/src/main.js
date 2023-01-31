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

  // Built-in 'ground' shape.
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 50, height: 50 },
    scene
  );

  const material = new BABYLON.StandardMaterial("groundMaterial", scene);

  const groundTexture = new BABYLON.Texture(
    "https://playground.babylonjs.com/textures/floor.png"
  );
  groundTexture.uScale = groundTexture.vScale = 20;
  material.diffuseTexture = groundTexture;

  const groundBumpTexture = new BABYLON.Texture(
    "https://playground.babylonjs.com/textures/floor_bump.png"
  );
  groundBumpTexture.uScale = groundBumpTexture.vScale = 20;
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
    result.animationGroups.forEach((ag) => {
      if (ag.name === "Idle") {
        ag.start(true);
      } else {
        ag.stop();
      }
    });
    root.rotate(BABYLON.Vector3.Up(), Math.PI);
  });

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
