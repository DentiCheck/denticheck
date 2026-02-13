import * as React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { cn } from "../../lib/utils";

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof View> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [tabValue, setTabValue] = React.useState(value || defaultValue || "");

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      setTabValue(newValue);
      onValueChange?.(newValue);
    },
    [onValueChange],
  );

  return (
    <TabsContext.Provider
      value={{ value: tabValue, onValueChange: handleValueChange }}
    >
      <View className={cn("flex-col gap-2", className)} {...props}>
        {children}
      </View>
    </TabsContext.Provider>
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof View>) {
  return (
    <View
      className={cn("flex-row bg-muted rounded-xl p-1", className)}
      {...props}
    />
  );
}

function TabsTrigger({
  value,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof TouchableOpacity> & {
  value: string;
}) {
  const context = React.useContext(TabsContext);
  const isActive = context?.value === value;

  return (
    <TouchableOpacity
      onPress={() => context?.onValueChange(value)}
      className={cn(
        "flex-1 items-center justify-center py-2 px-3 rounded-lg",
        isActive ? "bg-card" : "bg-transparent",
        className,
      )}
      style={
        isActive
          ? {
              elevation: 2,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
            }
          : undefined
      }
      {...props}
    >
      {typeof children === "string" ? (
        <Text
          className={cn(
            "font-medium text-sm",
            isActive ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

function TabsContent({
  value,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof View> & { value: string }) {
  const context = React.useContext(TabsContext);
  if (context?.value !== value) return null;

  return (
    <View className={cn("mt-2", className)} {...props}>
      {children}
    </View>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
