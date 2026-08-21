import type { ReactNode } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';

import { colors } from '@/theme/tokens';
import { useDesignScale } from '@/theme/useDesignScale';

const backSheetImage = require('../../../assets/design/Back Screen.jpg');

// 856x1852 — an exact 2x export of the 428x926 design frame, so at offsetY 0
// and heightScale 1 the photo lines up point-for-point with the frame.
const IMAGE_ASPECT_RATIO = 1852 / 856;

// ---------------------------------------------------------------------------
// THESE ARE THE KNOBS for how far down the screen the produce band reaches.
// Both are in design-frame points (the 428x926 frame) and are scaled to the
// device automatically, so a value tuned on one phone holds on all of them.
//
//   offsetY      Slides the whole photo vertically. NEGATIVE moves it UP,
//                which is what pulls the band up off the content: the fade
//                into cream ends higher, and what gets cropped instead is the
//                TOP of the band, which is uniform produce texture and reads
//                as no loss at all. The photo keeps its own proportions, so
//                this is the distortion-free control — reach for it first.
//                Every -10 here lifts the band ~10pt up the screen.
//
//   heightScale  Squashes or stretches the photo vertically. 1 is the file's
//                own proportions. Below 1 pulls the fade up without cropping
//                anything, at the cost of compressing the produce — usable
//                down to about 0.85 before round vegetables start reading as
//                oval. Above 1 pushes the band further down.
//
// Change the defaults here to move both screens at once; pass the props of the
// same name to move one screen only (welcome-back does, because its wordmark
// starts higher up the cream than welcome's hero does).
// ---------------------------------------------------------------------------
const BACKDROP = {
  offsetY: -64,
  heightScale: 1,
};

type Props = {
  children: ReactNode;
  offsetY?: number;
  heightScale?: number;
};

// Shared full-bleed photo background for welcome and welcome-back.
//
// The produce photo and its fade down into warmCream are already painted into
// the file — it needs no gradient overlay. An earlier version cropped it to
// the top 55% and layered a LinearGradient over it, which double-faded an
// already-faded photo.
//
// Anything the photo doesn't reach is covered by the container's warmCream,
// which is the same color the photo's own lower two-thirds is, so lifting it
// leaves no visible seam at the bottom.
export function PhotoBackdrop({
  children,
  offsetY = BACKDROP.offsetY,
  heightScale = BACKDROP.heightScale,
}: Props) {
  const { width } = useWindowDimensions();
  const { ds } = useDesignScale();

  return (
    <View style={styles.container}>
      <Image
        source={backSheetImage}
        style={{
          position: 'absolute',
          left: 0,
          top: ds(offsetY),
          width,
          height: width * IMAGE_ASPECT_RATIO * heightScale,
        }}
        // The box above is already computed to the file's own aspect (times
        // heightScale), so `stretch` crops nothing and heightScale does
        // exactly what it says. `cover` would centre its own crop and fight
        // both knobs.
        resizeMode="stretch"
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  content: {
    flex: 1,
  },
});
