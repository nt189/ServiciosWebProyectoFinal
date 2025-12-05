const API_BASE = "http://localhost:3000";

const solicitudesBody = document.getElementById("solicitudesLibrosBody");
const btnRefrescarSolicitudes = document.getElementById("btnRefrescarSolicitudes");
const solicitudesOk = document.getElementById("solicitudesOk");
const solicitudesError = document.getElementById("solicitudesError");

const patroForm = document.getElementById("patroForm");
const patroNombre = document.getElementById("patroNombre");
const patroGiro = document.getElementById("patroGiro");
const patroNivel = document.getElementById("patroNivel");
const btnLimpiarPatro = document.getElementById("btnLimpiarPatro");
const patroOk = document.getElementById("patroOk");
const patroError = document.getElementById("patroError");
const patroBody = document.getElementById("patroBody");

function setMsg(elOk, elErr, okMsg = "", errMsg = "") {
	if (elOk) elOk.textContent = okMsg;
	if (elErr) elErr.textContent = errMsg;
}

function buildRow({ categoria, key, s }) {
	const estado = s?.Estado || "Pendiente";
	const tr = document.createElement("tr");
	tr.innerHTML = `
		<td>${s.Solicitante || "-"}</td>
		<td>${categoria.slice(0, -1)}</td>
		<td>${s.Titulo || "-"}</td>
		<td>${s.Autor || "-"}</td>
		<td>${s.ISBN || "-"}</td>
		<td>${estado}</td>
		<td>
			<button class="btn btn-secondary" data-accion="aceptar" data-category="${categoria}" data-key="${key}">Aceptar</button>
			<button class="btn btn-outline" data-accion="rechazar" data-category="${categoria}" data-key="${key}">Rechazar</button>
		</td>
	`;
	return tr;
}

async function cargarSolicitudes() {
	if (!solicitudesBody) return;
	setMsg(solicitudesOk, solicitudesError, "", "");
	solicitudesBody.innerHTML = "";
	try {
		const resp = await fetch(`${API_BASE}/solicitudes`);
		if (!resp.ok) throw new Error("Error al cargar solicitudes");
		const data = await resp.json();

		const categorias = Object.keys(data || {});
		if (!categorias.length) {
			const tr = document.createElement("tr");
			tr.innerHTML = `<td colspan="7">No hay solicitudes registradas.</td>`;
			solicitudesBody.appendChild(tr);
			return;
		}

		let pendientes = 0;
		categorias.forEach((categoria) => {
			const porCategoria = data[categoria] || {};
			Object.entries(porCategoria).forEach(([key, s]) => {
				const estado = s?.Estado || "Pendiente";
				if (estado !== "Pendiente") return; // ocultar aprobadas/rechazadas
				pendientes++;
				const tr = buildRow({ categoria, key, s });
				solicitudesBody.appendChild(tr);
			});
		});

		if (pendientes === 0) {
			const tr = document.createElement("tr");
			tr.innerHTML = `<td colspan="7">No hay solicitudes pendientes.</td>`;
			solicitudesBody.appendChild(tr);
		}
	} catch (e) {
		console.error(e);
		setMsg(solicitudesOk, solicitudesError, "", "No se pudieron obtener las solicitudes.");
	}
}

async function aceptarArticulo(key, categoria, solicitud) {
	try {
		const tipo = (categoria.slice(0, -1) || "").toLowerCase();
		console.log(tipo);
		// Mapear a tipos esperados del microservicio de contenidos
		// Si la categoría no coincide, usamos la categoría tal cual
		const contenidoPayload = {
			titulo: solicitud.Titulo || "Sin título",
			tipo: tipo || "contenido",
			autor: solicitud.Autor || "",
			isbn: (solicitud.ISBN || "").toString(),
			precio: 100,
			stock: 10,
			categoria: tipo || "general",
			descripcion: `Aprobado desde solicitud ${key}`,
		};
		console.log("Contenido a crear:", contenidoPayload);
		const crearResp = await fetch(`${API_BASE}/contenidos`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(contenidoPayload),
		});
		if (!crearResp.ok) {
			const t = await crearResp.text();
			throw new Error(t || "Error al crear contenido");
		}

		const actualizarResp = await fetch(`${API_BASE}/solicitudes/${categoria}/${key}/estado`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ Estado: "Aprobado" }),
		});
		if (!actualizarResp.ok) {
			const t = await actualizarResp.text();
			throw new Error(t || "Error al actualizar estado de solicitud");
		}

		setMsg(solicitudesOk, solicitudesError, "Artículo aceptado y agregado al catálogo.", "");
		await cargarSolicitudes();
	} catch (e) {
		console.error(e);
		setMsg(solicitudesOk, solicitudesError, "", "No se pudo aceptar la solicitud.");
	}
}

function wireSolicitudesActions() {
	if (!solicitudesBody) return;
	solicitudesBody.addEventListener("click", async (ev) => {
		const btn = ev.target.closest("button");
		if (!btn) return;
		const accion = btn.getAttribute("data-accion");
		const key = btn.getAttribute("data-key");
		const categoria = btn.getAttribute("data-category");

		const tr = btn.closest("tr");
		const tds = tr ? tr.querySelectorAll("td") : [];
		const solicitud = {
			Solicitante: tds[0]?.textContent || "",
			Titulo: tds[2]?.textContent || "",
			Autor: tds[3]?.textContent || "",
			ISBN: tds[4]?.textContent || "",
		};

		if (accion === "aceptar") {
			await aceptarArticulo(key, categoria, solicitud);
		} else if (accion === "rechazar") {
			try {
				const resp = await fetch(`${API_BASE}/solicitudes/${categoria}/${key}/estado`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ Estado: "Rechazado" }),
				});
				if (!resp.ok) {
					const t = await resp.text();
					throw new Error(t || "Error al rechazar solicitud");
				}
				setMsg(solicitudesOk, solicitudesError, "Solicitud marcada como Rechazado.", "");
				await cargarSolicitudes();
			} catch (e) {
				console.error(e);
				setMsg(solicitudesOk, solicitudesError, "", "No se pudo rechazar la solicitud.");
			}
		}
	});
}

async function cargarPatrocinadores() {
	if (!patroBody) return;
	patroBody.innerHTML = "";
	try {
		const resp = await fetch(`${API_BASE}/patrocinadores`);
		if (!resp.ok) throw new Error("Error al cargar patrocinadores");
		const data = await resp.json();
		const items = data || {};
		const nombres = Object.keys(items);
		if (!nombres.length) {
			const tr = document.createElement("tr");
			tr.innerHTML = `<td colspan="4">No hay patrocinadores registrados.</td>`;
			patroBody.appendChild(tr);
			return;
		}
		nombres.forEach((nombre) => {
			const p = items[nombre] || {};
			const tr = document.createElement("tr");
			tr.innerHTML = `
				<td>${nombre}</td>
				<td>${p.Giro || "-"}</td>
				<td>${p.Nivel || "-"}</td>
				<td>${p.Estado || "-"}</td>
			`;
			patroBody.appendChild(tr);
		});
	} catch (e) {
		console.error(e);
	}
}

function wirePatroForm() {
	if (!patroForm) return;
	patroForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		setMsg(patroOk, patroError, "", "");
		try {
			const payload = {
				Nombre: (patroNombre.value || "").trim(),
				Giro: (patroGiro.value || "").trim(),
				Nivel: (patroNivel.value || "").trim(),
				FechaRegistro: new Date().toISOString(),
				FechaActualización: new Date().toISOString(),
			};
			if (!payload.Nombre || !payload.Giro || !payload.Nivel) {
				setMsg(patroOk, patroError, "", "Completa todos los campos.");
				return;
			}
			const resp = await fetch(`${API_BASE}/patrocinadores`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!resp.ok) {
				const t = await resp.text();
				throw new Error(t || "Error al registrar patrocinador");
			}
			setMsg(patroOk, patroError, "Patrocinador registrado con éxito.", "");
			patroForm.reset();
			await cargarPatrocinadores();
		} catch (e) {
			console.error(e);
			setMsg(patroOk, patroError, "", "No se pudo registrar el patrocinador.");
		}
	});
	if (btnLimpiarPatro) {
		btnLimpiarPatro.addEventListener("click", () => {
			patroForm.reset();
			setMsg(patroOk, patroError, "", "");
		});
	}
}

async function init() {
	wireSolicitudesActions();
	wirePatroForm();
	if (btnRefrescarSolicitudes) {
		btnRefrescarSolicitudes.addEventListener("click", cargarSolicitudes);
	}
	await cargarSolicitudes();
	await cargarPatrocinadores();
}

document.addEventListener("DOMContentLoaded", init);

