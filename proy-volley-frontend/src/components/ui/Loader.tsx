export default function Loader({ label }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "2px solid #2a3243",
          borderTopColor: "#ffd24a",
          animation: "spin 0.8s linear infinite",
        }}
      />
      {label && <span style={{ fontSize: 13, opacity: 0.8 }}>{label}</span>}

      <style>{`
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
}
