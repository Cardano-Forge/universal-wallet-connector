import { SUPPORTED_WALLETS } from "@/lib/main";
import { useExtensions, useWallet } from "@/lib/react";
import { useDialogContext } from "../hooks/dialog.context";
import { WalletBtn } from "./wallet-btn";

const WalletDialog = () => {
  const connect = useWallet("connect");
  const { isOpen, close } = useDialogContext();
  const supportedExtensions = useExtensions((s) => s.supportedMap);

  const handleConnectWallet = async (key: string) => {
    connect(key, {
      onSuccess() {
        close();
      },
    });
  };

  return (
    <dialog open={isOpen} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Connect wallet</h3>
        <div className="grid grid-cols-4 gap-4">
          {SUPPORTED_WALLETS.map((info) => (
            <WalletBtn
              key={info.key}
              info={info}
              installed={supportedExtensions.has(info.key)}
              onClick={handleConnectWallet}
            />
          ))}
        </div>
        <div className="modal-action">
          <button type="button" className="btn btn-secondary" onClick={close} aria-label="Close">
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default WalletDialog;
