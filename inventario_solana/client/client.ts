import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import * as web3 from "@solana/web3.js";
import type { Inventario } from "../target/types/inventario";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.Inventario as anchor.Program<Inventario>;

async function runCRUD() {
  console.log("🚀 Iniciando interacción con el inventario...");

  const productoKp = new web3.Keypair();
  console.log("📦 Dirección del nuevo producto:", productoKp.publicKey.toBase58());

  try {
    // ── CREATE ──────────────────────────────────────────────────────────────
    console.log("\n➕ Creando producto: Arroz...");
    const txCreate = await program.methods
      .crearProducto("Arroz", new BN(100), new BN(2500))
      .accounts({
        producto: productoKp.publicKey,
        usuario: program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([productoKp])
      .rpc();
    await program.provider.connection.confirmTransaction(txCreate); // ← esperamos confirmación
    console.log("✅ Producto creado!");

    // ── READ ─────────────────────────────────────────────────────────────────
    let datosProd = await program.account.producto.fetch(productoKp.publicKey);
    console.log("\n📋 Estado inicial:");
    console.log(`  Nombre   : ${datosProd.nombre}`);
    console.log(`  Cantidad : ${datosProd.cantidad.toString()}`);
    console.log(`  Precio   : $${datosProd.precio.toString()}`);
    console.log(`  Activo   : ${datosProd.activo}`);
    console.log(`  Propietario: ${datosProd.propietario.toBase58()}`);

    // ── UPDATE ───────────────────────────────────────────────────────────────
    console.log("\n🔄 Actualizando stock y precio...");
    const txUpdate = await program.methods
      .actualizarStock(new BN(80), new BN(3000))
      .accounts({
        producto: productoKp.publicKey,
        propietario: program.provider.publicKey,
      })
      .rpc();
    await program.provider.connection.confirmTransaction(txUpdate); // ← esperamos confirmación
    console.log("✅ Producto actualizado!");

    datosProd = await program.account.producto.fetch(productoKp.publicKey);
    console.log("\n📋 Estado tras actualización:");
    console.log(`  Cantidad : ${datosProd.cantidad.toString()}`);
    console.log(`  Precio   : $${datosProd.precio.toString()}`);

    // ── TOGGLE ───────────────────────────────────────────────────────────────
    console.log("\n🔁 Desactivando producto...");
    const txToggle1 = await program.methods
      .toggleActivo()
      .accounts({
        producto: productoKp.publicKey,
        propietario: program.provider.publicKey,
      })
      .rpc();
    await program.provider.connection.confirmTransaction(txToggle1); // ← esperamos confirmación

    datosProd = await program.account.producto.fetch(productoKp.publicKey);
    console.log(`✅ Activo ahora: ${datosProd.activo}`);

    console.log("\n🔁 Reactivando producto...");
    const txToggle2 = await program.methods
      .toggleActivo()
      .accounts({
        producto: productoKp.publicKey,
        propietario: program.provider.publicKey,
      })
      .rpc();
    await program.provider.connection.confirmTransaction(txToggle2); // ← esperamos confirmación

    datosProd = await program.account.producto.fetch(productoKp.publicKey);
    console.log(`✅ Activo ahora: ${datosProd.activo}`);

    // ── DELETE ───────────────────────────────────────────────────────────────
    console.log("\n🗑️ Eliminando producto y recuperando SOL...");
    const txDelete = await program.methods
      .eliminarProducto()
      .accounts({
        producto: productoKp.publicKey,
        propietario: program.provider.publicKey,
      })
      .rpc();
    await program.provider.connection.confirmTransaction(txDelete); // ← esperamos confirmación
    console.log("✅ Producto eliminado, SOL devuelto al propietario.");

    const cuentaCerrada = await program.provider.connection.getAccountInfo(productoKp.publicKey);
    console.log("\n🔍 Cuenta cerrada:", cuentaCerrada === null ? "Sí ✅" : "No ❌");

  } catch (error) {
    console.error("❌ Error en la transacción:", error);
  }
}

runCRUD();