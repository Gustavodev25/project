"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useToast } from "./ui/toaster";

type FormData = {
  nome: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  pais: string;
};

// Usando o sistema de inputs padronizado

const EyeOpen = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
    <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />
  </svg>
);

const EyeClosed = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M10.585 10.587a2 2 0 0 0 2.829 2.828" />
    <path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87" />
    <path d="M3 3l18 18" />
  </svg>
);

export default function Cadastro() {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState<FormData>({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    pais: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  // GSAP refs
  const gradient1Ref = useRef<HTMLDivElement>(null);
  const gradient2Ref = useRef<HTMLDivElement>(null);
  const gradient3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gradient1Ref.current || !gradient2Ref.current || !gradient3Ref.current)
      return;
    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    gsap.set(gradient1Ref.current, { scale: 1.5, opacity: 0.8 });
    gsap.set(gradient2Ref.current, { scale: 1.2, opacity: 0.6 });
    gsap.set(gradient3Ref.current, { scale: 1.8, opacity: 0.7 });

    tl.to(
      gradient1Ref.current,
      { x: 100, y: 50, scale: 2, duration: 20, ease: "sine.inOut" },
      0,
    )
      .to(
        gradient2Ref.current,
        { x: -80, y: 100, scale: 1.5, duration: 25, ease: "sine.inOut" },
        0,
      )
      .to(
        gradient3Ref.current,
        { x: 60, y: -70, scale: 2.2, duration: 30, ease: "sine.inOut" },
        0,
      );

    const rot = gsap.to(
      [gradient1Ref.current, gradient2Ref.current, gradient3Ref.current],
      {
        rotation: 360,
        duration: 60,
        repeat: -1,
        ease: "none",
        stagger: 5,
      },
    );

    return () => {
      tl.kill();
      rot.kill();
    };
  }, []);

  const normalizedEmail = useMemo(
    () => form.email.trim().toLowerCase(),
    [form.email],
  );

  const strength = useMemo(() => {
    const v = form.senha ?? "";
    let score = 0;
    if (v.length >= 8) score++;
    if (/[a-z]/.test(v)) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    return Math.min(score, 5);
  }, [form.senha]);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateClient = (): string | null => {
    if (form.senha !== form.confirmarSenha) return "As senhas não correspondem";
    if (form.senha.length < 8)
      return "A senha deve ter pelo menos 8 caracteres";
    if (
      !/[a-z]/.test(form.senha) ||
      !/[A-Z]/.test(form.senha) ||
      !/\d/.test(form.senha) ||
      !/[^A-Za-z0-9]/.test(form.senha)
    )
      return "Senha fraca: use maiúscula, minúscula, número e símbolo";
    if (!form.nome.trim()) return "Informe seu nome";
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
      return "Email inválido";
    if (!form.pais) return "Selecione o país";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateClient();
    if (v) {
      toast({ variant: "error", title: "Corrija os campos", description: v });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome.trim(),
          email: normalizedEmail,
          senha: form.senha,
          pais: form.pais,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.error || "Falha no cadastro";
        toast({
          variant: "error",
          title: "Erro no cadastro",
          description: msg,
        });
        throw new Error(msg);
      }

      toast({
        variant: "success",
        title: "Cadastro realizado!",
        description: "Conta criada com sucesso. Você já pode fazer login.",
        duration: 3500,
      });
      router.push("/login");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Ocorreu um erro durante o cadastro.";
      toast({ variant: "error", title: "Erro inesperado", description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 bg-white">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
              Crie sua conta
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Comece sua jornada conosco
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="nome"
                className="input-label"
              >
                Nome
                <span className="required">*</span>
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                autoComplete="name"
                required
                value={form.nome}
                onChange={onChange}
                className="input-base"
                placeholder="Digite seu nome completo"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="input-label"
              >
                Email
                <span className="required">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={onChange}
                className="input-base"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="senha"
                className="input-label"
              >
                Senha
                <span className="required">*</span>
              </label>
              <div className="relative">
                <input
                  id="senha"
                  name="senha"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={form.senha}
                  onChange={onChange}
                  className="input-base"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 bg-transparent p-2 rounded-md focus:outline-none"
                  aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPw ? <EyeClosed /> : <EyeOpen />}
                  <span className="sr-only">
                    {showPw ? "Ocultar" : "Mostrar"}
                  </span>
                </button>
              </div>
              <div className="mt-2 h-2 w-full bg-gray-100 rounded">
                <div
                  className="h-2 rounded transition-all"
                  style={{
                    width: `${(strength / 5) * 100}%`,
                    background:
                      strength <= 2
                        ? "#ef4444"
                        : strength === 3
                          ? "#f59e0b"
                          : "#16a34a",
                  }}
                />
              </div>
              <p className="input-helper">
                Use maiúscula, minúscula, número e símbolo.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmarSenha"
                className="input-label"
              >
                Confirmar Senha
                <span className="required">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmarSenha"
                  name="confirmarSenha"
                  type={showPw2 ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={form.confirmarSenha}
                  onChange={onChange}
                  className="input-base"
                  placeholder="Digite a senha novamente"
                />
                <button
                  type="button"
                  onClick={() => setShowPw2((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
                  aria-label={
                    showPw2
                      ? "Ocultar confirmação de senha"
                      : "Mostrar confirmação de senha"
                  }
                >
                  {showPw2 ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="pais"
                className="input-label"
              >
                País
                <span className="required">*</span>
              </label>
              <select
                id="pais"
                name="pais"
                required
                value={form.pais}
                onChange={onChange}
                className="input-base input-select"
              >
                <option value="">Selecione seu país</option>
                <option value="BR">Brasil</option>
                <option value="PT">Portugal</option>
                <option value="US">Estados Unidos</option>
                <option value="CA">Canadá</option>
                <option value="MX">México</option>
                <option value="AR">Argentina</option>
                <option value="CL">Chile</option>
                <option value="CO">Colômbia</option>
                <option value="PE">Peru</option>
                <option value="UY">Uruguai</option>
                <option value="PY">Paraguai</option>
                <option value="BO">Bolívia</option>
                <option value="EC">Equador</option>
                <option value="VE">Venezuela</option>
                <option value="ES">Espanha</option>
                <option value="FR">França</option>
                <option value="DE">Alemanha</option>
                <option value="IT">Itália</option>
                <option value="UK">Reino Unido</option>
                <option value="JP">Japão</option>
                <option value="CN">China</option>
                <option value="KR">Coreia do Sul</option>
                <option value="IN">Índia</option>
                <option value="AU">Austrália</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5 mx-auto"
                  viewBox="0 0 24 24"
                  aria-label="Criando conta"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth={4}
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                "Criar conta"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="text-black font-medium hover:underline underline-offset-2"
            >
              Fazer login
            </Link>
          </p>
        </div>
      </div>

      {/* Lateral visual */}
      <div
        className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
        }}
      >
        <div
          ref={gradient1Ref}
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255, 152, 0, 0.8) 0%, rgba(255, 87, 34, 0.6) 50%, transparent 70%)",
            filter: "blur(60px)",
            top: "-20%",
            right: "-10%",
          }}
        />
        <div
          ref={gradient2Ref}
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255, 193, 7, 0.7) 0%, rgba(255, 111, 0, 0.5) 50%, transparent 70%)",
            filter: "blur(80px)",
            bottom: "-15%",
            left: "-10%",
          }}
        />
        <div
          ref={gradient3Ref}
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255, 138, 101, 0.6) 0%, rgba(255, 152, 0, 0.4) 50%, transparent 70%)",
            filter: "blur(70px)",
            top: "30%",
            left: "20%",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(45deg, rgba(255, 107, 53, 0.3) 0%, rgba(247, 147, 30, 0.2) 100%)",
          }}
        />
      </div>
    </div>
  );
}
