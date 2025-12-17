import { Outlet } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0e14", // oscuro tipo FIDS
        color: "#ffffff",
      }}
    >
      <Outlet />
    </div>
  );
}
