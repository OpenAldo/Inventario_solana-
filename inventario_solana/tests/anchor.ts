import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import assert from "assert";
import * as web3 from "@solana/web3.js";
import type { Inventario } from "../target/types/inventario";

describe("inventario", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Inventario as anchor.Program<Inventario>;
  
  // Keypair del producto — se reutiliza entre tests
  const productoKp = new web3.Keypair();

  // ── CREATE ────────────────────────────────────────────────────────────────
  it("Crea un producto correctamente", async () => {
    const txHash = await program.methods
      .crearProducto("Arroz", new BN(100), new BN(2500))
      .accounts({
        producto: productoKp.publicKey,
        usuario: program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([productoKp])
      .rpc();

    await program.provider.connection.confirmTransaction(txHash);

    const prod = await program.account.producto.fetch(productoKp.publicKey);
    assert.equal(prod.nombre, "Arroz");
    assert(prod.cantidad.eq(new BN(100)));
    assert(prod.precio.eq(new BN(2500)));
    assert.equal(prod.activo, true);
    assert.equal(
      prod.propietario.toBase58(),
      program.provider.publicKey.toBase58()
    );
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────
  it("Actualiza stock y precio correctamente", async () => {
    const txHash = await program.methods
      .actualizarStock(new BN(80), new BN(3000))
      .accounts({
        producto: productoKp.publicKey,
        propietario: program.provider.publicKey,
      })
      .rpc();

    await program.provider.connection.confirmTransaction(txHash);

    const prod = await program.account.producto.fetch(productoKp.publicKey);
    assert(prod.cantidad.eq(new BN(80)));
    assert(prod.precio.eq(new BN(3000)));
  });

  // ── TOGGLE ────────────────────────────────────────────────────────────────
  it("Toggle desactiva y reactiva el producto", async () => {
    // Desactivar
    await program.methods
      .toggleActivo()
      .accounts({
        producto: productoKp.publicKey,
        propietario: program.provider.publicKey,
      })
      .rpc();

    let prod = await program.account.producto.fetch(productoKp.publicKey);
    assert.equal(prod.activo, false);

    // Reactivar
    await program.methods
      .toggleActivo()
      .accounts({
        producto: productoKp.publicKey,
        propietario: program.provider.publicKey,
      })
      .rpc();

    prod = await program.account.producto.fetch(productoKp.publicKey);
    assert.equal(prod.activo, true);
  });

  // ── VALIDACIONES ──────────────────────────────────────────────────────────
  it("Falla al crear producto con nombre vacío", async () => {
    const otroKp = new web3.Keypair();
    try {
      await program.methods
        .crearProducto("", new BN(10), new BN(500))
        .accounts({
          producto: otroKp.publicKey,
          usuario: program.provider.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([otroKp])
        .rpc();
      assert.fail("Debió fallar con nombre vacío");
    } catch (err) {
      assert.ok(err.message.includes("NombreVacio"));
    }
  });

  it("Falla al actualizar un producto inactivo", async () => {
    // Primero desactivar
    await program.methods
      .toggleActivo()
      .accounts({
        producto: productoKp.publicKey,
        propietario: program.provider.publicKey,
      })
      .rpc();

    try {
      await program.methods
        .actualizarStock(new BN(50), new BN(1000))
        .accounts({
          producto: productoKp.publicKey,
          propietario: program.provider.publicKey,
        })
        .rpc();
      assert.fail("Debió fallar con producto inactivo");
    } catch (err) {
      assert.ok(err.message.includes("ProductoInactivo"));
    }

    // Reactivar para el siguiente test
    await program.methods
      .toggleActivo()
      .accounts({
        producto: productoKp.publicKey,
        propietario: program.provider.publicKey,
      })
      .rpc();
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  it("Elimina el producto y cierra la cuenta", async () => {
    const txHash = await program.methods
      .eliminarProducto()
      .accounts({
        producto: productoKp.publicKey,
        propietario: program.provider.publicKey,
      })
      .rpc();

    await program.provider.connection.confirmTransaction(txHash);

    const cuentaCerrada = await program.provider.connection.getAccountInfo(productoKp.publicKey);
    assert.equal(cuentaCerrada, null);
  });
});