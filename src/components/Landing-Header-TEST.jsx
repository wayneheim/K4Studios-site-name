import React from "react";

export default function LandingHeaderTEST({ breadcrumb }) {
  return (
    <div role="banner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", background: "#eee" }}>
      <div>{breadcrumb}</div>
      <div>Nav placeholder</div>
    </div>
  );
}
