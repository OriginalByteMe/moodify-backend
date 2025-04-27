class PixelPeeper {
    pixels = [];
  
    constructor() { }
  
    ExtractPixels(imageData) {
      const MAX_PIXELS = 50_000;
      // Clear existing pixels if need be
      this.pixels = [];
  
  
  
      // Check if imageData is a decoded image object (from jpeg-js)
      if (imageData.data && imageData.width && imageData.height) {
        // Use the decoded data
        const pixelData = imageData.data;
        const total = pixelData.length >> 2;       // rgba groups
        const stride = Math.max(1, Math.floor(total / MAX_PIXELS));
        for (let i = 0; i < pixelData.length; i += stride * 4) {
          const r = pixelData[i];
          const g = pixelData[i + 1];
          const b = pixelData[i + 2];
          const a = pixelData[i + 3];
  
          // Only include pixels with sufficient opacity
          if (a > 0) {
            this.pixels.push([r, g, b]);
          }
        }
      } else {
        // Assume it's raw pixel data (1D array of RGBA values)
        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];
  
          // Only include pixels with sufficient opacity
          if (a > 0) {
            this.pixels.push([r, g, b]);
          }
        }
      }
    }
  
  
    FindColourRanges(pixels) {
      // Initialize min and max values for RGB
      let rMin = 255, rMax = 0;
      let gMin = 255, gMax = 0;
      let bMin = 255, bMax = 0;
  
      // Find min and max for each color channel
      for (const pixel of pixels) {
        const [r, g, b] = pixel;
  
        rMin = Math.min(rMin, r);
        rMax = Math.max(rMax, r);
        gMin = Math.min(gMin, g);
        gMax = Math.max(gMax, g);
        bMin = Math.min(bMin, b);
        bMax = Math.max(bMax, b);
      }
  
      // Calculate ranges
      const rRange = rMax - rMin;
      const gRange = gMax - gMin;
      const bRange = bMax - bMin;
  
      return {
        r: { min: rMin, max: rMax, range: rRange },
        g: { min: gMin, max: gMax, range: gRange },
        b: { min: bMin, max: bMax, range: bRange }
      };
    }
  
    FindDominantChannel(colourRanges) {
      if (colourRanges.r.range >= colourRanges.g.range && colourRanges.r.range >= colourRanges.b.range) {
        return 'r'
      }
  
      if (colourRanges.g.range >= colourRanges.r.range && colourRanges.g.range >= colourRanges.b.range) {
        return 'g'
      }
      return 'b'
    }
  
  
    // Helper: Convert RGB to HSL
    rgbToHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
  
      if (max === min) {
        h = s = 0; // achromatic
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return [h, s, l];
    }
  
    CalculateRepresentativeColour(pixels) {
      if (pixels.length === 0) return [0, 0, 0];
  
      let maxVibrancy = -1;
      let vibrantPixel = pixels[0];
  
      for (const [r, g, b] of pixels) {
        const [h, s, l] = this.rgbToHsl(r, g, b);
        const vibrancy = s * (1 - Math.abs(l - 0.65));
        if (vibrancy > maxVibrancy) {
          maxVibrancy = vibrancy;
          vibrantPixel = [r, g, b];
        }
      }
      return vibrantPixel;
    }
  
    nthElement(arr, n, channelIdx) {
      if (arr.length === 1) return arr[0];
  
      const pivot = arr[Math.floor(Math.random() * arr.length)][channelIdx];
      const lows = arr.filter(p => p[channelIdx] < pivot);
      const highs = arr.filter(p => p[channelIdx] > pivot);
      const pivots = arr.length - lows.length - highs.length;
  
      if (n < lows.length) return this.nthElement(lows, n, channelIdx);
      if (n < lows.length + pivots) return pivot;                       // found
      return this.nthElement(highs, n - lows.length - pivots, channelIdx);
    }
    MedianCut(pixels, depth, maxDepth) {
      // Final result of recursion branch, return colour
      if (depth == maxDepth || pixels.length == 0) {
        return [this.CalculateRepresentativeColour(pixels)]
      }
  
      // Find the colour channel with the largest range
      const colourRanges = this.FindColourRanges(pixels)
      const dominantChannel = this.FindDominantChannel(colourRanges)
  
      // Sort pixels by the dominant colour channel
      switch (dominantChannel) {
        case "r":
          pixels.sort((a, b) => a[0] - b[0])
          break;
        case "g":
          pixels.sort((a, b) => a[1] - b[1])
          break;
        case "b":
          pixels.sort((a, b) => a[2] - b[2])
          break;
      }
  
      // Split the pixels at the median point
      const median = Math.floor(pixels.length / 2)
      const bucket1 = pixels.slice(0, median)
      const bucket2 = pixels.slice(median)
  
      // Recursively apply median cut to each bucket
      return this.MedianCut(bucket1, depth + 1, maxDepth).concat(this.MedianCut(bucket2, depth + 1, maxDepth))
  
    }
  
  
    GetColorPalette(numColours) {
      // 2^depth = numColours, so depth = log2(numColours)
      const depth = Math.min(4, Math.ceil(Math.log2(numColours)));
  
      // Apply median cut algorithm
      const palette = this.MedianCut(this.pixels, 0, depth);
  
      // # Ensure we have exactly the requested number of colors
      if (palette.length > numColours) {
        return palette.slice(0, numColours);
      }
  
      // # If we have fewer colors than requested, duplicate some
      while (palette.length < numColours) {
        palette.push(palette[palette.length % palette.length]);
      }
  
      palette.sort((a, b) => {
        const brightnessA = 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2];
        const brightnessB = 0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2];
        return brightnessB - brightnessA; // descending order
      });
  
      return palette;
    }
  
    async checkAndSeeTheImageData(imageData) {
      console.log(
        "🚀 ~ PixelPeeper ~ checkAndSeeTheImageData ~ imageData:",
        imageData
      );
      const { data, width, height } = imageData;
      console.log("🚀 ~ PixelPeeper ~ checkAndSeeTheImageData ~ data:", data);
  
      this.ExtractPixels(imageData);
      console.log(this.pixels)
    }
  }
  
  export default PixelPeeper;
  