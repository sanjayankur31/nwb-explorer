import React, { lazy, Suspense } from 'react';
import NWBPlot from './reduxconnect/NWBPlotContainer';
import FileExplorerPage from './pages/FileExplorerPage';
import Metadata from './Metadata';
import NWBListViewer from './reduxconnect/NWBListViewerContainer';
import SweepTableViewer from './reduxconnect/SweepTableViewerContainer';
import ImageViewer from './ImageViewer';
import { getConsole } from '../services/NotebookService';

export default class WidgetFactory{

  constructor () {

    this.widgets = {};
  }

  /**
   * Widget configuration is the same we are using in the flexlayout actions
   *
   * @param { id, name, component, panelName, [instancePath], * } widgetConfig 
   */
  factory (widgetConfig) {

    // With this lazy construction we avoidto trigger an update on every layout event.

    this.widgets[widgetConfig.id] = this.newWidget(widgetConfig);
    
    
    return this.widgets[widgetConfig.id];
  }
  
  updateWidget (widgetConfig) {
    this.widgets[widgetConfig.id] = this.newWidget(widgetConfig);
    return this.widgets[widgetConfig.id];
  }
  
  newWidget (widgetConfig) {
    const component = widgetConfig.component;
    switch (component) {
    case "Explorer":
      return <FileExplorerPage key={widgetConfig.id} />;
            
    case "Metadata":{
      const { instancePath, showObjectInfo } = widgetConfig;
      return instancePath 
        ? <Metadata key={widgetConfig.id} instancePath = { instancePath } showObjectInfo = { showObjectInfo } /> 
        : 'Please select an entry on the right to view the details of that data.';
    }    
    case "ImageSeries": {
      const { instancePath } = widgetConfig;
      if (!instancePath){
        throw new Error('Image widget instancePath must be configured')
      }
      return <ImageViewer
        key={widgetConfig.id} 
        numberOfImagesToPreload={2}
        imagePaths={this.extractImageSeriesPaths(instancePath)} 
        timestamps={this.extractImageSeriesTimestamps(instancePath)}
      />
    }
    case "Plot": { 
      const { instancePaths } = widgetConfig;
      if (!instancePaths){
        throw new Error('Plot widget instancePath must be configured')
      }
      return (
        <NWBPlot key={widgetConfig.id} instancePaths={ instancePaths } />
      )
    } 
    case "ListViewer": {
      const { pathPattern, typePattern } = widgetConfig;
    
      return <NWBListViewer key={widgetConfig.id} pathPattern={pathPattern} typePattern={typePattern}></NWBListViewer>;
    }
    case "SweepTable": {    
      return <SweepTableViewer key={widgetConfig.id} />;
    }
    case "PythonConsole": {
      return getConsole(GEPPETTO_CONFIGURATION.forceNewNotebook, GEPPETTO_CONFIGURATION.oneFileOneNotebook);
    }
    }
  }

  extractImageSeriesPaths (instancePath){
    const projectId = Project.getId()
    const [ nwbfile, interfase, ...name ] = instancePath.split('.')

    const num_samples_var = Instances.getInstance(instancePath).getType().getVariables().find(v => v.getName() == "num_samples")
    const num_samples = parseInt(num_samples_var.getInitialValue().value.text)

    return new Array(num_samples).fill(0).map((el, index) => `api/image?name=${name.join()}&interface=${interfase}&projectId=${projectId}&index=${index}&clientId=${GEPPETTO.MessageSocket.getClientID()}`)
  }

  extractImageSeriesTimestamps (instancePath){
    const timestamps = Instances.getInstance(`${instancePath}.timestamps`)
    const values = timestamps.getInitialValue()[0].value.value

    if (!values){
      // If no timestamps
      const num_samples_var = Instances.getInstance(instancePath).getType().getVariables().find(v => v.getName() == "num_samples")
      const num_samples = parseInt(num_samples_var.getInitialValue().value.text)
      return new Array(num_samples).fill(0).map((el, index) => index)
    }

    return values.map(timestamp => new Date(parseFloat(timestamp) * 1000).toString().replace(/\(.*\)/g, ''))
  }
} 