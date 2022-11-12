const MIN_CHUNK_SIZE = Math.pow(2, 17); // 128kb

class FragmentLoader {
  config;
  loader = null;
  partLoadTimeout = -1;

  constructor(config) {
    this.config = config;
  }

  destroy() {
    if (this.loader) {
      this.loader.destroy();
      this.loader = null;
    }
  }

  abort() {
    if (this.loader) {
      // Abort the loader for current fragment. Only one may load at any given time
      this.loader.abort();
    }
  }

  load(frag, onProgress) {
    const url = frag.url;
    if (!url) {
      return Promise.reject(
        new LoadError(
          {
            type: ErrorTypes.NETWORK_ERROR,
            details: ErrorDetails.FRAG_LOAD_ERROR,
            fatal: false,
            frag,
            networkDetails: null
          },
          `Fragment does not have a ${url ? "part list" : "url"}`
        )
      );
    }
    this.abort();

    const config = this.config;
    const FragmentILoader = config.fLoader;
    const DefaultILoader = config.loader;

    return new Promise((resolve, reject) => {
      if (this.loader) {
        this.loader.destroy();
      }
      const loader =
        (this.loader =
        frag.loader =
          FragmentILoader
            ? new FragmentILoader(config)
            : new DefaultILoader(config));
      const loaderContext = createLoaderContext(frag);
      const loaderConfig = {
        timeout: config.fragLoadingTimeOut,
        maxRetry: 0,
        retryDelay: 0,
        maxRetryDelay: config.fragLoadingMaxRetryTimeout,
        highWaterMark: frag.sn === "initSegment" ? Infinity : MIN_CHUNK_SIZE
      };
      // Assign frag stats to the loader's stats reference
      frag.stats = loader.stats;
      loader.load(loaderContext, loaderConfig, {
        onSuccess: (response, stats, context, networkDetails) => {
          this.resetLoader(frag, loader);
          let payload = response.data;
          if (context.resetIV && frag.decryptdata) {
            frag.decryptdata.iv = new Uint8Array(payload.slice(0, 16));
            payload = payload.slice(16);
          }
          resolve({
            frag,
            part: null,
            payload,
            networkDetails
          });
        },
        onError: (response, context, networkDetails) => {
          this.resetLoader(frag, loader);
          reject(
            new LoadError({
              type: ErrorTypes.NETWORK_ERROR,
              details: ErrorDetails.FRAG_LOAD_ERROR,
              fatal: false,
              frag,
              response,
              networkDetails
            })
          );
        },
        onAbort: (stats, context, networkDetails) => {
          this.resetLoader(frag, loader);
          reject(
            new LoadError({
              type: ErrorTypes.NETWORK_ERROR,
              details: ErrorDetails.INTERNAL_ABORTED,
              fatal: false,
              frag,
              networkDetails
            })
          );
        },
        onTimeout: (response, context, networkDetails) => {
          this.resetLoader(frag, loader);
          reject(
            new LoadError({
              type: ErrorTypes.NETWORK_ERROR,
              details: ErrorDetails.FRAG_LOAD_TIMEOUT,
              fatal: false,
              frag,
              networkDetails
            })
          );
        },
        onProgress: (stats, context, data, networkDetails) => {
          if (onProgress) {
            onProgress({
              frag,
              part: null,
              payload: data,
              networkDetails
            });
          }
        }
      });
    });
  }

  loadPart(frag, part, onProgress) {
    this.abort();

    const config = this.config;
    const FragmentILoader = config.fLoader;
    const DefaultILoader = config.loader;

    return new Promise((resolve, reject) => {
      if (this.loader) {
        this.loader.destroy();
      }
      const loader =
        (this.loader =
        frag.loader =
          FragmentILoader
            ? new FragmentILoader(config)
            : new DefaultILoader(config));
      const loaderContext = createLoaderContext(frag, part);
      const loaderConfig = {
        timeout: config.fragLoadingTimeOut,
        maxRetry: 0,
        retryDelay: 0,
        maxRetryDelay: config.fragLoadingMaxRetryTimeout,
        highWaterMark: MIN_CHUNK_SIZE
      };
      // Assign part stats to the loader's stats reference
      part.stats = loader.stats;
      loader.load(loaderContext, loaderConfig, {
        onSuccess: (response, stats, context, networkDetails) => {
          this.resetLoader(frag, loader);
          this.updateStatsFromPart(frag, part);
          const partLoadedData = {
            frag,
            part,
            payload: response.data,
            networkDetails
          };
          onProgress(partLoadedData);
          resolve(partLoadedData);
        },
        onError: (response, context, networkDetails) => {
          this.resetLoader(frag, loader);
          reject(
            new LoadError({
              type: ErrorTypes.NETWORK_ERROR,
              details: ErrorDetails.FRAG_LOAD_ERROR,
              fatal: false,
              frag,
              part,
              response,
              networkDetails
            })
          );
        },
        onAbort: (stats, context, networkDetails) => {
          frag.stats.aborted = part.stats.aborted;
          this.resetLoader(frag, loader);
          reject(
            new LoadError({
              type: ErrorTypes.NETWORK_ERROR,
              details: ErrorDetails.INTERNAL_ABORTED,
              fatal: false,
              frag,
              part,
              networkDetails
            })
          );
        },
        onTimeout: (response, context, networkDetails) => {
          this.resetLoader(frag, loader);
          reject(
            new LoadError({
              type: ErrorTypes.NETWORK_ERROR,
              details: ErrorDetails.FRAG_LOAD_TIMEOUT,
              fatal: false,
              frag,
              part,
              networkDetails
            })
          );
        }
      });
    });
  }

  updateStatsFromPart(frag, part) {
    const fragStats = frag.stats;
    const partStats = part.stats;
    const partTotal = partStats.total;
    fragStats.loaded += partStats.loaded;
    if (partTotal) {
      const estTotalParts = Math.round(frag.duration / part.duration);
      const estLoadedParts = Math.min(
        Math.round(fragStats.loaded / partTotal),
        estTotalParts
      );
      const estRemainingParts = estTotalParts - estLoadedParts;
      const estRemainingBytes =
        estRemainingParts * Math.round(fragStats.loaded / estLoadedParts);
      fragStats.total = fragStats.loaded + estRemainingBytes;
    } else {
      fragStats.total = Math.max(fragStats.loaded, fragStats.total);
    }
    const fragLoading = fragStats.loading;
    const partLoading = partStats.loading;
    if (fragLoading.start) {
      // add to fragment loader latency
      fragLoading.first += partLoading.first - partLoading.start;
    } else {
      fragLoading.start = partLoading.start;
      fragLoading.first = partLoading.first;
    }
    fragLoading.end = partLoading.end;
  }

  resetLoader(frag, loader) {
    frag.loader = null;
    if (this.loader === loader) {
      self.clearTimeout(this.partLoadTimeout);
      this.loader = null;
    }
    loader.destroy();
  }
}

function createLoaderContext(frag, part = null) {
  const segment = part || frag;
  const loaderContext = {
    frag,
    part,
    responseType: "arraybuffer",
    url: segment.url,
    headers: {},
    rangeStart: 0,
    rangeEnd: 0
  };
  const start = segment.byteRangeStartOffset;
  const end = segment.byteRangeEndOffset;
  if (Number.isFinite(start) && Number.isFinite(end)) {
    let byteRangeStart = start;
    let byteRangeEnd = end;
    if (frag.sn === "initSegment" && frag.decryptdata?.method === "AES-128") {
      // MAP segment encrypted with method 'AES-128', when served with HTTP Range,
      // has the unencrypted size specified in the range.
      // Ref: https://tools.ietf.org/html/draft-pantos-hls-rfc8216bis-08#section-6.3.6
      const fragmentLen = end - start;
      if (fragmentLen % 16) {
        byteRangeEnd = end + (16 - (fragmentLen % 16));
      }
      if (start !== 0) {
        loaderContext.resetIV = true;
        byteRangeStart = start - 16;
      }
    }
    loaderContext.rangeStart = byteRangeStart;
    loaderContext.rangeEnd = byteRangeEnd;
  }
  return loaderContext;
}

class LoadError extends Error {
  data;
  constructor(data, ...params) {
    super(...params);
    this.data = data;
  }
}
