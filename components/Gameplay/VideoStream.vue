<template>
  <div class="video-container">
    <!-- Twitch -->
    <iframe
      v-if="streamType === 'twitch'"
      :src="twitchEmbedUrl"
      frameborder="0"
      allowfullscreen
      class="stream-frame"
    ></iframe>

    <!-- MJPEG -->
    <iframe
      v-else-if="streamType === 'mjpeg'"
      :src="mjpegPageUrl"
      frameborder="0"
      class="stream-frame"
    ></iframe>

    <!-- Janus -->
    <div v-else-if="streamType === 'janus'" class="janus-container">
      <video
        ref="janusVideo"
        autoplay
        muted
        playsinline
        class="stream-frame"
      ></video>

      <div v-if="janusStatus !== 'Streaming'" class="stream-status">
        {{ janusStatus }}
      </div>
    </div>

    <!-- Fallback -->
    <div v-else class="error-msg">Unknown stream type.</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";

const props = defineProps({
  streamType: {
    type: String,

    required: true,

    validator: (value) => ["twitch", "janus", "mjpeg"].includes(value),
  },
});

/*
 * ---------------------------------------------------------
 * STREAM CONFIGURATION
 * ---------------------------------------------------------
 */

const config = useRuntimeConfig();
const JANUS_SERVER = config.public.janusUrl;

const JANUS_STREAM_ID = config.public.janusStreamId;

const RECONNECT_DELAY = 2000;

const mjpegPageUrl = "http://10.159.181.248:8000/index.html";

const twitchEmbedUrl =
  "https://player.twitch.tv/?channel=Soccer_Robots&parent=localhost";

/*
 * ---------------------------------------------------------
 * JANUS STATE
 * ---------------------------------------------------------
 */

const janusVideo = ref(null);

const janusStatus = ref("Connecting...");

let JanusClass = null;

let janus = null;

let streaming = null;

let reconnectTimer = null;

let reconnectScheduled = false;

let shuttingDown = false;

/*
 * ---------------------------------------------------------
 * STATUS
 * ---------------------------------------------------------
 */

function setStatus(message) {
  console.log("[Janus]", message);

  janusStatus.value = message;
}

/*
 * ---------------------------------------------------------
 * START JANUS
 * ---------------------------------------------------------
 */

async function startJanus() {
  if (props.streamType !== "janus") {
    return;
  }

  shuttingDown = false;

  reconnectScheduled = false;

  try {
    /*
     * Dynamic import is intentional.
     *
     * Nuxt performs server-side rendering,
     * while Janus/WebRTC only exists in
     * the browser.
     */
    const janusModule = await import("janus-gateway");

    const adapterModule = await import("webrtc-adapter");

    JanusClass = janusModule.default;

    const adapter = adapterModule.default;

    setStatus("Initializing Janus...");

    JanusClass.init({
      debug: false,

      dependencies: JanusClass.useDefaultDependencies({
        adapter,
      }),

      callback: function () {
        if (!JanusClass.isWebrtcSupported()) {
          setStatus("WebRTC is not supported");

          return;
        }

        connectJanus();
      },
    });
  } catch (error) {
    console.error("Failed to load Janus:", error);

    setStatus("Failed to load Janus");

    scheduleReconnect();
  }
}

/*
 * ---------------------------------------------------------
 * CONNECT TO JANUS SERVER
 * ---------------------------------------------------------
 */

function connectJanus() {
  if (shuttingDown || props.streamType !== "janus") {
    return;
  }

  reconnectScheduled = false;

  setStatus("Connecting to camera...");

  janus = new JanusClass({
    server: JANUS_SERVER,

    /*
     * Soccer Robots currently runs
     * entirely on the local 10.42.0.x
     * network.
     */
    iceServers: [],

    success: function () {
      setStatus("Connected to Janus");

      attachStreamingPlugin();
    },

    error: function (error) {
      console.error("Janus connection error:", error);

      setStatus("Camera server unavailable");

      scheduleReconnect();
    },

    destroyed: function () {
      janus = null;

      streaming = null;

      if (!shuttingDown) {
        setStatus("Connection lost");

        scheduleReconnect();
      }
    },
  });
}

/*
 * ---------------------------------------------------------
 * ATTACH STREAMING PLUGIN
 * ---------------------------------------------------------
 */

function attachStreamingPlugin() {
  if (!janus || shuttingDown) {
    return;
  }

  janus.attach({
    plugin: "janus.plugin.streaming",

    success: function (pluginHandle) {
      streaming = pluginHandle;

      setStatus("Requesting camera...");

      watchStream();
    },

    error: function (error) {
      console.error("Streaming plugin error:", error);

      setStatus("Streaming plugin unavailable");

      scheduleReconnect();
    },

    iceState: function (state) {
      console.log("[Janus] ICE:", state);

      if (state === "failed") {
        setStatus("Video connection failed");

        scheduleReconnect();
      }
    },

    webrtcState: function (connected) {
      console.log("[Janus] WebRTC:", connected);

      if (connected) {
        setStatus("Streaming");
      } else if (!shuttingDown) {
        setStatus("Video disconnected");
      }
    },

    slowLink: function (uplink, lost, mid) {
      console.warn("[Janus] Slow link", {
        uplink,
        lost,
        mid,
      });
    },

    onmessage: function (message, jsep) {
      console.log("[Janus] Message:", message);

      if (message.error) {
        console.error("Streaming error:", message.error);

        setStatus("Streaming error");

        scheduleReconnect();

        return;
      }

      if (jsep) {
        answerJanusOffer(jsep);
      }
    },

    onremotetrack: function (track, mid, added, metadata) {
      console.log("[Janus] Remote track:", track.kind, mid, added, metadata);

      if (!added) {
        return;
      }

      if (track.kind !== "video") {
        return;
      }

      if (!janusVideo.value) {
        return;
      }

      const stream = new MediaStream([track]);

      JanusClass.attachMediaStream(janusVideo.value, stream);

      janusVideo.value.play().catch(function (error) {
        console.error("Video playback error:", error);
      });
    },

    oncleanup: function () {
      console.log("[Janus] Streaming cleanup");

      if (janusVideo.value) {
        janusVideo.value.srcObject = null;
      }
    },
  });
}

/*
 * ---------------------------------------------------------
 * REQUEST STREAM 43
 * ---------------------------------------------------------
 */

function watchStream() {
  if (!streaming) {
    return;
  }

  streaming.send({
    message: {
      request: "watch",

      id: JANUS_STREAM_ID,
    },
  });
}

/*
 * ---------------------------------------------------------
 * SDP NEGOTIATION
 * ---------------------------------------------------------
 */

function answerJanusOffer(jsep) {
  if (!streaming) {
    return;
  }

  setStatus("Starting video...");

  streaming.createAnswer({
    jsep: jsep,

    success: function (answer) {
      streaming.send({
        message: {
          request: "start",
        },

        jsep: answer,
      });
    },

    error: function (error) {
      console.error("WebRTC negotiation error:", error);

      setStatus("Video negotiation failed");

      scheduleReconnect();
    },
  });
}

/*
 * ---------------------------------------------------------
 * RECONNECT
 * ---------------------------------------------------------
 */

function scheduleReconnect() {
  if (shuttingDown || reconnectScheduled || props.streamType !== "janus") {
    return;
  }

  reconnectScheduled = true;

  setStatus("Reconnecting...");

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  reconnectTimer = setTimeout(function () {
    reconnectScheduled = false;

    cleanupJanus();

    if (!shuttingDown && props.streamType === "janus") {
      connectJanus();
    }
  }, RECONNECT_DELAY);
}

/*
 * ---------------------------------------------------------
 * CLEANUP
 * ---------------------------------------------------------
 */

function cleanupJanus() {
  streaming = null;

  if (janusVideo.value) {
    janusVideo.value.srcObject = null;
  }

  if (janus) {
    const session = janus;

    janus = null;

    try {
      session.destroy({
        cleanupHandles: true,

        notifyDestroyed: false,
      });
    } catch (error) {
      console.warn("Janus cleanup error:", error);
    }
  }
}

function stopJanus() {
  shuttingDown = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);

    reconnectTimer = null;
  }

  reconnectScheduled = false;

  cleanupJanus();
}

/*
 * ---------------------------------------------------------
 * COMPONENT LIFECYCLE
 * ---------------------------------------------------------
 */

onMounted(function () {
  if (props.streamType === "janus") {
    startJanus();
  }
});

watch(
  () => props.streamType,

  function (newType, oldType) {
    if (oldType === "janus" && newType !== "janus") {
      stopJanus();
    }

    if (newType === "janus" && oldType !== "janus") {
      startJanus();
    }
  },
);

onBeforeUnmount(function () {
  stopJanus();
});
</script>

<style scoped>
.video-container {
  width: 100%;

  max-width: 960px;

  margin: auto;

  padding: 10px;
}

.janus-container {
  position: relative;

  width: 100%;

  background: black;
}

.stream-frame {
  display: block;

  width: 100%;

  height: 540px;

  object-fit: contain;

  border: 0;

  background: black;
}

.stream-status {
  position: absolute;

  left: 16px;

  bottom: 16px;

  padding: 8px 12px;

  border-radius: 6px;

  background: rgba(0, 0, 0, 0.7);

  color: white;

  font-size: 14px;
}

.error-msg {
  color: red;

  font-weight: bold;

  text-align: center;
}
</style>
