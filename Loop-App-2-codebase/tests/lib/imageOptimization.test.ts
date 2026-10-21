import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  compressAvatarImage,
  preloadAvatars,
  avatarLoadedCache,
} from "@/lib/imageOptimization";

// jsdom cannot drive the real HTMLImageElement load lifecycle or canvas 2d
// contexts, so substitute a controllable fake while the real sizing and
// fallback logic (in imageOptimization.ts) still runs.
class FakeImage {
  static created: FakeImage[] = [];
  width = 800;
  height = 600;
  onload: () => void = () => {};
  onerror: () => void = () => {};
  _src = "";
  constructor() {
    FakeImage.created.push(this);
  }
  set src(value: string) {
    this._src = value;
    queueMicrotask(() => this.onload());
  }
  get src() {
    return this._src;
  }
}

const originalImage = globalThis.Image;

function makeJpegFile(name = "photo.jpg"): File {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
  return new File([bytes], name, { type: "image/jpeg" });
}

beforeEach(() => {
  avatarLoadedCache.clear();
  FakeImage.created = [];
  Object.defineProperty(URL, "createObjectURL", {
    value: vi.fn((arg: Blob | File) => `blob:mock-${(arg as File).name ?? "blob"}`),
    configurable: true,
  });
  vi.stubGlobal("Image", FakeImage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(URL, "createObjectURL", {
    value: undefined,
    configurable: true,
  });
  (globalThis as { Image: unknown }).Image = originalImage;
});

describe("compressAvatarImage", () => {
  it("passes GIFs through untouched (animation preserved)", async () => {
    const file = new File([new Uint8Array([71, 73, 70])], "avatar.gif", { type: "image/gif" });

    const result = await compressAvatarImage(file);

    expect(result.file).toBe(file);
    expect(result.fileExt).toBe("gif");
    expect(result.contentType).toBe("image/gif");
    expect(result.originalSize).toBe(file.size);
    expect(result.compressedSize).toBe(file.size);
    expect(result.previewUrl).toMatch(/^blob:mock-avatar\.gif$/);
  });

  it("passes SVGs through untouched (vector preserved)", async () => {
    const file = new File([new Uint8Array([1])], "logo.SVG", { type: "image/svg+xml" });

    const result = await compressAvatarImage(file);

    expect(result.file).toBe(file);
    expect(result.fileExt).toBe("svg");
    expect(result.contentType).toBe("image/svg+xml");
  });

  it("falls back to the original file when no canvas 2d context exists", async () => {
    // jsdom's canvas has no 2d context → the real fallback branch runs.
    const file = makeJpegFile("selfie.jpg");

    const result = await compressAvatarImage(file, 256, 0.7);

    expect(result.file).toBe(file);
    expect(result.fileExt).toBe("jpg");
    expect(result.contentType).toBe("image/jpeg");
    expect(result.previewUrl).toMatch(/^blob:mock-selfie\.jpg$/);
    // Exactly one image decode was attempted.
    expect(FakeImage.created).toHaveLength(1);
  });

  it("rejects when the image cannot be parsed", async () => {
    class BrokenImage extends FakeImage {
      set src(value: string) {
        this._src = value;
        queueMicrotask(() => this.onerror());
      }
    }
    vi.stubGlobal("Image", BrokenImage);

    await expect(compressAvatarImage(makeJpegFile())).rejects.toThrow("Unable to parse image data");
  });
});

describe("preloadAvatars", () => {
  it("preloads only http(s) URLs and remembers them in the session cache", async () => {
    preloadAvatars([
      "https://supabase.co/avatar-1.jpg",
      "blob:local-preview", // not http → skipped
      null,
      undefined,
      "data:inline", // not http → skipped
    ]);

    await new Promise((r) => setTimeout(r, 0));

    expect(FakeImage.created).toHaveLength(1);
    expect(avatarLoadedCache.has("https://supabase.co/avatar-1.jpg")).toBe(true);
  });

  it("skips URLs already resident in the session cache", async () => {
    avatarLoadedCache.add("https://supabase.co/known.jpg");

    preloadAvatars(["https://supabase.co/known.jpg", "https://supabase.co/fresh.jpg"]);
    await new Promise((r) => setTimeout(r, 0));

    expect(FakeImage.created).toHaveLength(1);
    expect(FakeImage.created[0].src).toBe("https://supabase.co/fresh.jpg");
  });

  it("no-ops outside the browser", () => {
    const windowRef = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: undefined, configurable: true });
    try {
      expect(() => preloadAvatars(["https://x/y.jpg"])).not.toThrow();
      expect(FakeImage.created).toHaveLength(0);
    } finally {
      Object.defineProperty(globalThis, "window", { value: windowRef, configurable: true });
    }
  });
});
