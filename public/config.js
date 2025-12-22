export const CONFIG = {
  USE_RENDER: false,   // <-- flip this to false when testing locally

  LOCAL_BASE_URL: "http://localhost:5500",
  RENDER_BASE_URL: "https://taskmanagernew-jpeq.onrender.com",

  get BASE_URL() {
    return this.USE_RENDER ? this.RENDER_BASE_URL : this.LOCAL_BASE_URL;
  }
};
