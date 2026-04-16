import { useEffect } from "react";
import { useNavigate } from "react-router";

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/welcome"), 2200);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-6"
      style={{
        background:
          "linear-gradient(160deg, #09408c 0%, #122a4c 100%)",
      }}
    >
      <div className="flex flex-col items-center gap-5">
        <div
          className="flex items-center justify-center"
          style={{
            width: "280px",
            height: "140px",
          }}
        >
          <img
            src="https://wfmxfnwbmzetzygoanjh.supabase.co/storage/v1/object/public/ALI%20Digital/ALI%20Agenda/ChatGPT%20Image%2015%20abr%202026,%2008_39_58.png"
            alt="Logo FrescaMart"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="text-center">
          <p
            className="text-green-200"
            style={{ fontSize: "14px", fontWeight: 400 }}
          >
            Supermercado Digital
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-full bg-white"
            style={{
              width: i === 1 ? "20px" : "8px",
              height: "8px",
              opacity: i === 0 ? 1 : 0.4,
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>

      <p
        className="absolute bottom-12 text-green-200"
        style={{ fontSize: "12px" }}
      >
        Carregando...
      </p>
    </div>
  );
}