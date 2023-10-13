import React, { useState, useEffect } from 'react';

// @ts-ignore
import Babel from '@babel/standalone';

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

    const transpileAndLoad = (code) => {
        try {
            const transpiledCode = Babel.transform(code, {
                presets: ['react'],
            }).code;
    
            console.log('Transpiled code:', transpiledCode);
    
            const dynamicModule = {};
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
