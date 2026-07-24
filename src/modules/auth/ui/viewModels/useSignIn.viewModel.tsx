import { useCallback, useRef, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { SIGN_IN_CODE_LENGTH, SIGN_IN_ERROR_DISPLAY_MS } from "@/constants/appConstants";
import { SignInUseCase } from "../../core/usecases/SignIn.usecase";
import { CrewLeaderSession } from "../../core/entities/CrewLeaderSession.entity";

export const SESSION_EMPLOYEE_CODE_KEY = "session.employeeCode";

interface UseSignInViewModelArgs {
  onSignedIn: (session: CrewLeaderSession) => void;
}

export const useSignInViewModel = ({ onSignedIn }: UseSignInViewModelArgs) => {
  const { sessionAuthenticator, keyValueStore } = useDependencies();
  const [code, setCode] = useState("");
  const [hasError, setHasError] = useState(false);
  const submitting = useRef(false);

  // A ref rather than state: submit() is called from onKeyPress synchronously on "✓", and a
  // second fast tap could fire before the first render/state-update from setHasError=false
  // cycles through — a ref reads/writes immediately without waiting on a render, closing that gap.
  const submit = useCallback(
    async (fullCode: string) => {
      if (submitting.current) return;
      submitting.current = true;

      const usecase = new SignInUseCase(sessionAuthenticator);
      const result = await usecase.execute(fullCode);

      submitting.current = false;

      if (result.success) {
        setCode("");
        keyValueStore.setString(SESSION_EMPLOYEE_CODE_KEY, result.data.employeeCode);
        onSignedIn(result.data);
        return;
      }

      setHasError(true);
      setTimeout(() => {
        setHasError(false);
        setCode("");
      }, SIGN_IN_ERROR_DISPLAY_MS);
    },
    [sessionAuthenticator, keyValueStore, onSignedIn],
  );

  const onKeyPress = useCallback(
    (key: string) => {
      // Freeze the keypad for the duration of the error/shake state — otherwise a worker who
      // keeps tapping after a wrong code would build up a new code underneath the error display,
      // which then gets silently wiped by submit()'s own setCode("") once the timeout fires.
      if (hasError) return;

      if (key === "⌫") {
        setCode((prev) => prev.slice(0, -1));
        return;
      }

      if (key === "✓") {
        if (code.length === SIGN_IN_CODE_LENGTH) submit(code);
        return;
      }

      setCode((prev) => (prev.length >= SIGN_IN_CODE_LENGTH ? prev : prev + key));
    },
    [hasError, code, submit],
  );

  return {
    state: { code, codeLength: SIGN_IN_CODE_LENGTH, hasError },
    handlers: { onKeyPress },
  };
};
