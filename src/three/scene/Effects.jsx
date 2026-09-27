import {
  EffectComposer,
  Bloom,
  ToneMapping,
  N8AO,
  HueSaturation,
  Vignette
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { COLORS } from "../lib/palette";
export function Effects() {
  return <EffectComposer enableNormalPass={false} multisampling={0}>
      {/* AO profunda en los pliegues */}
      <N8AO
    aoRadius={1.1}
    distanceFalloff={0.7}
    intensity={1.5}
    aoSamples={10}
    denoiseSamples={5}
    denoiseRadius={10}
    halfRes
    color={COLORS.emeraldDark}
  />

      {/* El tone mapping neutro desatura los pasteles: se recupera aqui */}
      <HueSaturation saturation={0.2} />

      {/* Bloom minimo, solo para el halo de las farolas */}
      <Bloom
    intensity={0.12}
    luminanceThreshold={0.9}
    luminanceSmoothing={0.3}
    mipmapBlur
    radius={0.5}
  />

      {/* Vineta muy suave: enfoca la atencion en la maqueta */}
      <Vignette offset={0.32} darkness={0.16} />

      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>;
}
