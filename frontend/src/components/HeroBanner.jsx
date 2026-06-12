import { lazy, Suspense } from "react";
import { motion } from "motion/react";
import Button from "@cloudscape-design/components/button";

// Lazy so Three.js ships in its own chunk and never blocks first paint.
const Hero3D = lazy(() => import("./Hero3D"));

export default function HeroBanner({ description, onRefreshAll, loading }) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "16px",
        minHeight: "208px",
        background: "linear-gradient(135deg, #0a1f33 0%, #11324f 48%, #0a1f33 100%)",
        boxShadow: "0 24px 60px -28px rgba(9, 30, 51, 0.7)",
      }}
    >
      {/* 3D scene streams in after the page is interactive */}
      <Suspense fallback={null}>
        <Hero3D />
      </Suspense>

      {/* Scrim keeps the text readable over the moving scene */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, rgba(8,20,33,0.88) 0%, rgba(8,20,33,0.45) 58%, rgba(8,20,33,0) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          padding: "30px 34px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: "620px" }}>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              margin: 0,
              color: "#ffffff",
              fontSize: "30px",
              fontWeight: 700,
              letterSpacing: "-0.5px",
              lineHeight: 1.15,
              textShadow: "0 2px 14px rgba(0,0,0,0.45)",
            }}
          >
            La Bodega — Competitor Watch
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
            style={{
              margin: "10px 0 0",
              color: "rgba(255,255,255,0.82)",
              fontSize: "14px",
              lineHeight: 1.45,
            }}
          >
            {description}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          <Button iconName="refresh" variant="primary" onClick={onRefreshAll} loading={loading}>
            Refresh all
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
