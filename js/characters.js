'use strict';

function createCharacterModels(three, paths) {
  const requests = new Map();
  const loader = three.GLTFLoader ? new three.GLTFLoader() : null;

  async function load(id) {
    if (!loader || !paths[id]) return null;
    if (!requests.has(id)) {
      requests.set(id, new Promise(resolve => {
        loader.load(paths[id], gltf => {
          const model = gltf.scene;
          const bounds = new three.Box3().setFromObject(model);
          const height = bounds.max.y - bounds.min.y;
          if (!Number.isFinite(height) || height <= 0) {
            resolve(null);
            return;
          }
          const scale = 2.8 / height;
          const normalized = new three.Group();
          model.scale.multiplyScalar(scale);
          model.position.y -= bounds.min.y * scale;
          model.traverse(part => {
            if (part.isMesh) part.castShadow = true;
          });
          normalized.add(model);
          resolve(normalized);
        }, undefined, error => {
          console.warn('Modelo indisponível:', paths[id], error);
          resolve(null);
        });
      }));
    }
    const template = await requests.get(id);
    return template ? template.clone(true) : null;
  }

  return { load };
}
