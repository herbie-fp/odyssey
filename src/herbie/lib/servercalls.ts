export const getApi = async (
    endpoint: string,
    data: object,
    useJson: boolean = true
  ): Promise<any> => {
    const url = `${endpoint}`;
    // LATER add timeout?
    console.debug('calling', url, 'with data', data);
    const headers: Record<string, string> = {};

    if (useJson) {
      headers['Content-Type'] = 'application/json';
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data) // Convert data to JSON
      });
      const responseData = await response.json();
      if (responseData.error) {
        throw new Error('Herbie server: ' + responseData.error);
      }
      console.debug('got data', responseData);
      return responseData;
    } catch (error: any) {
      throw new Error(`Error sending data to Herbie server at ${url}:\n${error.message}`)

    }
  };