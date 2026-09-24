(function () {
    "use strict";

    var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
    var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

    /* ---------- Año del footer ---------- */
    var year = $("#year");
    if (year) year.textContent = new Date().getFullYear();

    /* ---------- Header: sombra al hacer scroll ---------- */
    var header = $(".site-header");
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* ---------- Menú móvil ---------- */
    var toggle = $(".nav-toggle");
    var menu = $("#menu-principal");
    var toggleLabel = toggle ? $(".sr-only", toggle) : null;

    function setMenu(open) {
        toggle.setAttribute("aria-expanded", String(open));
        menu.classList.toggle("is-open", open);
        if (toggleLabel) toggleLabel.textContent = open ? "Cerrar menú" : "Abrir menú";
    }
    if (toggle && menu) {
        toggle.addEventListener("click", function () {
            setMenu(toggle.getAttribute("aria-expanded") !== "true");
        });
        $$("a", menu).forEach(function (a) {
            a.addEventListener("click", function () { setMenu(false); });
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && menu.classList.contains("is-open")) {
                setMenu(false);
                toggle.focus();
            }
        });
        document.addEventListener("click", function (e) {
            if (menu.classList.contains("is-open") && !header.contains(e.target)) setMenu(false);
        });
        window.matchMedia("(min-width: 821px)").addEventListener("change", function (mq) {
            if (mq.matches) setMenu(false);
        });
    }

    /* ---------- Enlace activo según la sección visible ---------- */
    var navLinks = $$('.site-nav ul a[href^="#"]');
    if ("IntersectionObserver" in window && navLinks.length) {
        var byId = {};
        navLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
        var sections = ["inicio", "servicios", "galeria", "cita"].map(function (id) { return document.getElementById(id); }).filter(Boolean);
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var id = entry.target.id === "cita" ? "contacto" : entry.target.id;
                navLinks.forEach(function (a) {
                    var active = a === byId[id];
                    a.classList.toggle("is-active", active);
                    if (active) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
                });
            });
        }, { rootMargin: "-45% 0px -50% 0px" });
        sections.forEach(function (s) { spy.observe(s); });
    }

    /* ---------- Aparición suave ---------- */
    var reveals = $$(".reveal");
    if ("IntersectionObserver" in window) {
        var ro = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    ro.unobserve(entry.target);
                }
            });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
        reveals.forEach(function (el) { ro.observe(el); });
    } else {
        reveals.forEach(function (el) { el.classList.add("is-visible"); });
    }

    /* ---------- Lightbox de la galería ---------- */
    var lightbox = $("#lightbox");
    var items = $$(".gallery-item");
    var lbImg = $("#lightbox-img");
    var lbCaption = $("#lightbox-caption");
    var current = 0;
    var lastFocus = null;

    function show(index) {
        current = (index + items.length) % items.length;
        var link = items[current];
        var thumb = $("img", link);
        lbImg.src = link.getAttribute("href");
        lbImg.alt = thumb.alt;
        lbCaption.textContent = thumb.alt + " (" + (current + 1) + " de " + items.length + ")";
    }

    if (lightbox && typeof lightbox.showModal === "function" && items.length) {
        items.forEach(function (link, i) {
            link.setAttribute("aria-label", $("img", link).alt + ". Ver en grande");
            link.addEventListener("click", function (e) {
                e.preventDefault();
                lastFocus = link;
                show(i);
                lightbox.showModal();
                document.documentElement.classList.add("lb-open");
                $(".lb-close", lightbox).focus();
            });
        });
        lightbox.addEventListener("click", function (e) {
            var btn = e.target.closest("[data-lb]");
            if (btn) {
                var action = btn.getAttribute("data-lb");
                if (action === "close") lightbox.close();
                else show(current + (action === "next" ? 1 : -1));
            } else if (e.target === lightbox || e.target.classList.contains("lightbox-figure")) {
                lightbox.close();
            }
        });
        lightbox.addEventListener("keydown", function (e) {
            if (e.key === "ArrowRight") { e.preventDefault(); show(current + 1); }
            if (e.key === "ArrowLeft") { e.preventDefault(); show(current - 1); }
        });
        lightbox.addEventListener("close", function () {
            document.documentElement.classList.remove("lb-open");
            if (lastFocus) lastFocus.focus();
        });
        // Gesto de deslizar en móvil
        var startX = null;
        lightbox.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
        lightbox.addEventListener("touchend", function (e) {
            if (startX === null) return;
            var dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
            startX = null;
        });
    }

    /* ---------- Formulario de reserva ---------- */
    var form = $("#booking-form");
    if (!form) return;
    var status = $("#form-status");
    var service = $("#f-servicio");
    var date = $("#f-fecha");

    // Fecha mínima: hoy (hora local)
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var today = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    date.min = today;

    // Preseleccionar el servicio desde las tarjetas
    $$("[data-service]").forEach(function (link) {
        link.addEventListener("click", function () {
            service.value = link.getAttribute("data-service");
            clearError(service);
        });
    });

    function fieldOf(input) { return input.closest(".field"); }
    function errorOf(input) { return document.getElementById("e-" + input.name); }
    function setError(input) {
        fieldOf(input).classList.add("has-error");
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", "e-" + input.name);
        errorOf(input).hidden = false;
    }
    function clearError(input) {
        fieldOf(input).classList.remove("has-error");
        input.removeAttribute("aria-invalid");
        errorOf(input).hidden = true;
    }
    function isValid(input) {
        var v = input.value.trim();
        if (!v) return false;
        if (input.name === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        if (input.name === "telefono") return v.replace(/\D/g, "").length >= 7;
        if (input.name === "fecha") return v >= today;
        return true;
    }

    var fields = $$("input, select", form);
    fields.forEach(function (input) {
        var ev = input.tagName === "SELECT" ? "change" : "input";
        input.addEventListener(ev, function () { if (isValid(input)) clearError(input); });
    });

    function formatDate(iso) {
        var parts = iso.split("-");
        var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        try {
            return d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        } catch (err) { return iso; }
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var firstInvalid = null;
        fields.forEach(function (input) {
            if (isValid(input)) clearError(input);
            else { setError(input); if (!firstInvalid) firstInvalid = input; }
        });
        if (firstInvalid) { firstInvalid.focus(); return; }

        var data = {};
        fields.forEach(function (input) { data[input.name] = input.value.trim(); });
        var nice = formatDate(data.fecha);
        var subject = "Solicitud de cita: " + data.servicio + " – " + data.fecha + " " + data.hora;
        var body = [
            "Hola, Bella Nails:",
            "",
            "Me gustaría reservar una cita.",
            "",
            "Nombre: " + data.nombre,
            "Teléfono: " + data.telefono,
            "Email: " + data.email,
            "Servicio: " + data.servicio,
            "Fecha: " + nice,
            "Hora: " + data.hora,
            "",
            "Gracias."
        ].join("\n");
        var mailto = "mailto:citas@bellanails.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

        var first = data.nombre.split(/\s+/)[0];
        status.innerHTML = "";
        var strong = document.createElement("strong");
        strong.textContent = "¡Gracias, " + first + "!";
        var p = document.createElement("p");
        p.textContent = "Tu solicitud de " + data.servicio + " para el " + nice + " a las " + data.hora + " está lista. Se abrirá tu aplicación de correo para enviarla; el salón te confirmará la disponibilidad. ";
        var a = document.createElement("a");
        a.href = mailto;
        a.textContent = "¿No se abrió? Envía la solicitud aquí.";
        p.appendChild(a);
        status.appendChild(strong);
        status.appendChild(p);
        status.hidden = false;
        status.focus();

        window.location.href = mailto;
    });
})();
