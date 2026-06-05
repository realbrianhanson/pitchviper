import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast relative !rounded-none !border !border-border !bg-background !text-foreground !shadow-none before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-primary !p-4 !gap-2",
          title:
            "!font-display !text-base !leading-tight !text-foreground",
          description:
            "!font-body !text-xs !text-muted-foreground !mt-1",
          actionButton:
            "!font-mono !text-[10px] !uppercase !tracking-[0.2em] !rounded-none !bg-primary !text-primary-foreground !px-3 !py-1.5",
          cancelButton:
            "!font-mono !text-[10px] !uppercase !tracking-[0.2em] !rounded-none !bg-muted !text-muted-foreground !px-3 !py-1.5",
          success:
            "before:!bg-success [&_[data-icon]]:!text-success",
          error:
            "before:!bg-destructive [&_[data-icon]]:!text-destructive",
          warning:
            "before:!bg-warning [&_[data-icon]]:!text-warning",
          info:
            "before:!bg-primary [&_[data-icon]]:!text-primary",
          closeButton:
            "!rounded-none !border-border !bg-background hover:!bg-muted",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
