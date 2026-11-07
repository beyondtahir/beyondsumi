(() => {
  const config = window.BEYONDSUMI;
  const demo = config.demos.find((d) => d.id === "vector");
  window.SUMI_DELIVERY = {
    brand: "Beyondsumi",
    title: "The Lantern",
    subtitle:
      "A Sumi Vector film, painted in code, with music and sound effects.",
    catalogue: config.demos
            .map((d) => ({ name: d.style, description: d.purpose })),
    recreation_context:
      "Public showcase only. The editable film project and personal production history are not included. Ask the viewer for their own story and duration before producing a new film.",
    films: [
      {
        width: demo.width,
        height: demo.height,
        fps: demo.fps,
        duration: demo.seconds,
        bytes: demo.bytes,
        audio: true,
        sha256: demo.sha256,
        style: "Sumi Vector",
        description:
          "Painted in code with no images: ink silhouettes on a painted dusk, told with on-screen words, music and effects. No image-generation or video-generation API.",
        status: "demo",
        review_note:
          "A finished showcase film. Start your own project with the included skill and guides.",
        file: config.mediaBase + demo.file,
        download_name: demo.file,
        poster: "../assets/posters/vector.jpg",
      },
    ],
  };
})();
