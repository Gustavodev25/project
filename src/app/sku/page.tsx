import type { Metadata } from "next";
import GestaoSKU from "../components/views/GestaoSKU";

export const metadata: Metadata = {
  title: "SKU - Sistema de Gestão",
  description: "Gestão de produtos e SKUs",
};

export default function SKUPage() {
  return <GestaoSKU />;
}
