declare module "*.svg" {
    import * as React from "react";
    import { SVGProps } from "react-native-svg";
    const content: React.FC<SVGProps>;
    export default content;
}