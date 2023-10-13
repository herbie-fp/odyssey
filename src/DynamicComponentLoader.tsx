import React, { useState, useEffect } from 'react';

const babel = require('@babel/core');

interface DynamicComponentLoaderProps {
    componentString: string;
    data: any;
}

function DynamicComponentLoader(props: DynamicComponentLoaderProps) {
    const { componentString, data } = props;
    const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);

    useEffect(() => {
        transpileAndLoad(componentString);
    }, [componentString]);

    const transpileAndLoad = (code: string) => {
        try {
            const transpiledCode = babel.transform(code, {
                presets: ['react'],
            }).code;

            const dynamicModule: any = {};
            eval(transpiledCode + '\nmodule.exports = Component;');
            setComponent(() => dynamicModule.exports);
        } catch (error) {
            console.error("Failed to transpile and load the component:", error);
        }
    };

    if (!Component) return null;

    return <Component data={data} />;
}

export default DynamicComponentLoader;
