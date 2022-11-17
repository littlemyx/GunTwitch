function fLoader() {
  this.load = (context, config, callbacks) => {
    const url = context.url;
    const onSuccessCallback = callbacks.onSuccess;
    const onErrorCallback = callbacks.onError;
    const onTimeoutCallback = callbacks.onTimeout;

    const index = url[url.length - 4];

    const gun = Gun();

    console.log("start fetching");

    gun
      .get("muhin_video_test_1")
      .get("video")
      .get(index)
      .once(async value => {
        console.log(value);
        const arrayBuffer = await (await fetch(value)).arrayBuffer();

        onSuccessCallback(
          { data: arrayBuffer },
          {
            aborted: false,
            loaded: 1033624,
            retry: 0,
            total: 1033624,
            chunkCount: 0,
            bwEstimate: 0,
            loading: {
              start: 248.10000002384186,
              first: 251.60000002384186,
              end: 253.5
            },
            parsing: { start: 0, end: 0 },
            buffering: { start: 0, first: 0, end: 0 }
          },
          context
        );
      });
  };

  /* abort any loading in progress */
  this.abort = function () {
    console.log("abort");
    //this.loader.remove(magnetURI);
  };
  /* destroy loading context */
  this.destroy = function () {};

  this.stats = {
    aborted: false,
    loaded: 1033624,
    retry: 0,
    total: 1033624,
    chunkCount: 0,
    bwEstimate: 0,
    loading: {
      start: 248.10000002384186,
      first: 251.60000002384186,
      end: 253.5
    },
    parsing: { start: 0, end: 0 },
    buffering: { start: 0, first: 0, end: 0 }
  };
}
