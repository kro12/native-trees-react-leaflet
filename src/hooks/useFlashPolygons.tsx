// hooks/useFlashPolygons.ts
import { useState, useCallback } from 'react';
import type L from 'leaflet';

export const useFlashPolygons = (geoJsonRef: React.RefObject<L.GeoJSON | null>) => {
  const [isFlashing, setIsFlashing] = useState(false);

  const flash = useCallback(() => {
    const gj = geoJsonRef.current;
    if (!gj) return;

    setIsFlashing(true);

    const flashes = 3;
    const onMs = 250;
    const offMs = 200;
    const originals = new Map<L.Layer, L.PathOptions>();

    gj.eachLayer((layer) => {
      if ("setStyle" in layer) {
        const path = layer as L.Path;
        originals.set(layer, { ...(path.options) });
      }
    });

    let i = 0;

		const flashOn = () => {
			gj.eachLayer((layer) => {
				if ("setStyle" in layer) {
					const pathLayer = layer as L.Path;
					pathLayer.setStyle({
						weight: 5,
						opacity: 1,
						fillOpacity: 0.75,
						color: "#ffffff",
					});
					
					// Cast to type with bringToFront method
					if ('bringToFront' in pathLayer) {
						(pathLayer as L.Path & { bringToFront: () => void }).bringToFront();
					}
				}
			});
		};

    const flashOff = () => {
      gj.eachLayer((layer) => {
        if ("setStyle" in layer) {
          const original = originals.get(layer);
          if (original) (layer as L.Path).setStyle(original);
        }
      });
    };

    const run = () => {
      if (i >= flashes) {
        flashOff();
        setIsFlashing(false);
        return;
      }

      flashOn();
      window.setTimeout(() => {
        flashOff();
        i += 1;
        window.setTimeout(run, offMs);
      }, onMs);
    };

    run();
  }, [geoJsonRef]);

  return { flash, isFlashing };
};
