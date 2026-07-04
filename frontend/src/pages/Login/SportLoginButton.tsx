import Button from "../../components/ui/Button";

type SportLoginButtonProps = {
  isSubmitting: boolean;
  disabled?: boolean;
};

export default function SportLoginButton({ isSubmitting, disabled }: SportLoginButtonProps) {
  return (
    <Button
      type="submit"
      fullWidth
      disabled={disabled || isSubmitting}
      className={`sport-login-button${isSubmitting ? " sport-login-button--loading" : ""}`}
      style={{
        minHeight: 48,
        overflow: "hidden",
        position: "relative",
        transition: "transform 180ms ease, box-shadow 180ms ease, background 180ms ease",
      }}
    >
      {isSubmitting ? (
        <span className="match-loader" aria-label="Ingresando al sistema">
          <span className="match-ball" />
          <span className="match-loader__label">Ingresando...</span>
          <span className="match-score" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </span>
      ) : (
        "Ingresar"
      )}
    </Button>
  );
}